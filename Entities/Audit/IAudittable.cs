using System;
using System.Collections.Generic;
using System.Text;

namespace Entities.Audit
{
    public interface IAudittable
    {
        DateTime CreatedAt { get; set; }
        DateTime UpdatedAt { get; set; }
    }
    public interface IAudittable2
    {
        DateTime CreatedAt { get; set; }
    }
}
