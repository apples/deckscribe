using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace Copper
{
    public static class Crypto
    {
        public static byte[] GenerateSaltRaw(int bits)
        {
            var bytes = new byte[bits / 8];

            using var rng = RandomNumberGenerator.Create();
            
            rng.GetNonZeroBytes(bytes);

            return bytes;
        }

        public static string GenerateSalt(int bits = 128)
        {
            return Convert.ToBase64String(GenerateSaltRaw(bits));
        }

        public static byte[] CreateKey(int bits, string password, byte[] salt)
        {
            return KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 310000,
                numBytesRequested: bits / 8);
        }

        public static string HashPassword(string password, string saltBase64)
        {
            var saltBytes = Convert.FromBase64String(saltBase64);

            return Convert.ToBase64String(CreateKey(256, password, saltBytes));
        }

        public static EncryptedValue EncryptRaw(string plaintext, string secretKey, int saltBits, int keyBits)
        {
            using var aes = Aes.Create();

            var keySalt = GenerateSaltRaw(saltBits);

            aes.Key = CreateKey(keyBits, secretKey, keySalt);

            using var encryptor = aes.CreateEncryptor();
            using var memoryStream = new MemoryStream();

            {
                using var cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write);
                using var writer = new StreamWriter(cryptoStream);
                writer.Write(plaintext);
            }

            var encryptedBytes = memoryStream.ToArray();

            return new EncryptedValue(
                encryptedBytes: encryptedBytes,
                salt: keySalt,
                iv: aes.IV);
        }

        public static string DecryptRaw(EncryptedValue encrypted, string secretKey, int keyBits)
        {
            using var aes = Aes.Create();

            aes.Key = CreateKey(keyBits, secretKey, encrypted.Salt);
            aes.IV = encrypted.IV;

            using var decryptor = aes.CreateDecryptor();
            using var memoryStream = new MemoryStream(encrypted.EncryptedBytes);
            using var cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read);
            using var reader = new StreamReader(cryptoStream);

            return reader.ReadToEnd();
        }
    }

    public class EncryptedValue
    {
        public byte[] EncryptedBytes { get; set; }
        public byte[] Salt { get; set; }
        public byte[] IV { get; set; }

        public EncryptedValue(byte[] encryptedBytes, byte[] salt, byte[] iv)
        {
            EncryptedBytes = encryptedBytes;
            Salt = salt;
            IV = iv;
        }
    }
}
