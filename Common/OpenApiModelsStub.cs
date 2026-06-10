using System.Collections.Generic;

namespace Microsoft.OpenApi.Models
{
    public class OpenApiInfo
    {
        public string Title { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class OpenApiSecurityScheme
    {
        public ParameterLocation In { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public SecuritySchemeType Type { get; set; }
        public string BearerFormat { get; set; } = string.Empty;
        public string Scheme { get; set; } = string.Empty;
        public OpenApiReference Reference { get; set; }
    }

    public class OpenApiReference
    {
        public ReferenceType Type { get; set; }
        public string Id { get; set; } = string.Empty;
    }

    public enum ReferenceType { SecurityScheme }
    public enum ParameterLocation { Header }
    public enum SecuritySchemeType { Http }

    public class OpenApiSecurityRequirement : Dictionary<OpenApiSecurityScheme, IEnumerable<string>> { }
}
