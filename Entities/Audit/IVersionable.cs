using System;
using System.Collections.Generic;
using System.Text;

namespace Entities.Audit
{
    public interface IVersionable
    {
        int Version { get; set; }
    }
}
