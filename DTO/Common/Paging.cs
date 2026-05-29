using System;
using System.Collections.Generic;
using System.Text;

namespace DTO.Common
{
    public class Paging
    {
        public class PaginationResponse<T>
        {
            public int Page { get; set; }

            public int PageSize { get; set; }

            public int TotalCount { get; set; }

            public int TotalPages { get; set; }

            public List<T> Items { get; set; } = [];
        }
    }
}
