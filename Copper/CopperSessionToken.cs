using System;
using System.Collections.Generic;

namespace Copper
{
    public class CopperSessionToken
    {
        public string? Name { get; set; }
        public List<string> Roles { get; set; } = new List<string>();
        public DateTimeOffset CreatedOn { get; set; }
    }
}
