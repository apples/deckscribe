
using System.Linq;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DeckScribe;

public class RequiredNotNullableSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema.Properties == null)
        {
            return;
        }

        foreach (var property in schema.Properties.Where(x => !x.Value.Nullable))
        {
            schema.Required.Add(property.Key);
        }
    }
}
