using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace Copper
{
    public class CopperSeal
    {
        public static int MinimumSecretLength { get; } = 32;

        public string SecretKey { get; set; }
        public int EncryptionSaltBits { get; set; }
        public int EncryptionKeyBits { get; set; }
        public int IntegritySaltBits { get; set; }
        public int IntegrityKeyBits { get; set; }

        public CopperSeal(string secretKey, int encryptionSaltBits = 256, int encryptionKeyBits = 256, int integritySaltBits = 256, int integrityKeyBits = 256)
        {
            if (secretKey.Length < MinimumSecretLength)
            {
                throw new InvalidOperationException($"{nameof(secretKey)} needs to be at least {MinimumSecretLength} characters.");
            }

            SecretKey = secretKey;
            EncryptionSaltBits = encryptionSaltBits;
            EncryptionKeyBits = encryptionKeyBits;
            IntegritySaltBits = integritySaltBits;
            IntegrityKeyBits = integrityKeyBits;
        }

        public string Seal(string data)
        {
            var encoded = Encrypt(data);
            var token = Sign(encoded);

            return token;
        }

        public string? Unseal(string token)
        {
            var encoded = Verify(token);
            var data = encoded != null ? Decrypt(encoded) : null;

            return data;
        }

        private string Encrypt(string plaintext)
        {
            var encrypted = Crypto.EncryptRaw(plaintext, SecretKey, saltBits: EncryptionSaltBits, keyBits: EncryptionKeyBits);

            return $"{B64UrlEncode(encrypted.EncryptedBytes)}.{B64UrlEncode(encrypted.Salt)}.{B64UrlEncode(encrypted.IV)}";
        }

        private string? Decrypt(string encoded)
        {
            var parts = encoded.Split('.');

            if (parts.Length != 3)
            {
                return null;
            }

            var encryptedBytes = B64UrlDecode(parts[0]);
            var salt = B64UrlDecode(parts[1]);
            var iv = B64UrlDecode(parts[2]);

            if (encryptedBytes == null || salt == null || iv == null)
            {
                return null;
            }

            var encrypted = new EncryptedValue(
                encryptedBytes: encryptedBytes,
                salt: salt,
                iv: iv);

            return Crypto.DecryptRaw(encrypted, SecretKey, keyBits: EncryptionKeyBits);
        }

        private string Sign(string encoded)
        {
            var salt = Crypto.GenerateSaltRaw(IntegritySaltBits);

            var key = Crypto.CreateKey(IntegrityKeyBits, SecretKey, salt);

            using var hmac = new HMACSHA256(key);

            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(encoded));

            return $"{B64UrlEncode(hash)}.{B64UrlEncode(salt)}.{encoded}";
        }

        private string? Verify(string token)
        {
            var parts = token.Split('.', 3);

            if (parts.Length != 3)
            {
                return null;
            }

            var tokenHash = B64UrlDecode(parts[0]);
            var tokenHashSalt = B64UrlDecode(parts[1]);
            var encoded = parts[2];

            if (tokenHash == null || tokenHashSalt == null)
            {
                return null;
            }

            var key = Crypto.CreateKey(IntegrityKeyBits, SecretKey, tokenHashSalt);

            using var hmac = new HMACSHA256(key);

            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(encoded));

            if (new Span<byte>(hash).SequenceEqual(new Span<byte>(tokenHash)))
            {
                return encoded;
            }
            else
            {
                return null;
            }
        }

        private static string B64UrlEncode(byte[] bytes)
        {
            return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        private static byte[]? B64UrlDecode(string str)
        {
            var len = str.Length;
            if (len % 4 != 0)
                len += 4 - len % 4;
            
            try
            {
                return Convert.FromBase64String(str.Replace('-', '+').Replace('_', '/').PadRight(len, '='));
            }
            catch (FormatException)
            {
                return null;
            }
        }
    }

    public struct Result<T>
    {
        public T? result;
        public string? error;
    }
}
