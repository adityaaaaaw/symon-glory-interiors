import React from 'react';

const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      
      if (start === 1) {
        end = maxVisible;
      } else if (end === totalPages) {
        start = totalPages - maxVisible + 1;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();
  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-container flex justify-between items-center mt-4 w-full">
      <div className="pagination-info text-sm text-muted">
        Showing <span className="text-gold">{startIdx}</span> to <span className="text-gold">{endIdx}</span> of <span className="text-gold">{totalItems}</span> entries
      </div>
      <div className="pagination-buttons flex gap-2">
        <button 
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        {pages.map((p) => (
          <button
            key={p}
            className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button 
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
