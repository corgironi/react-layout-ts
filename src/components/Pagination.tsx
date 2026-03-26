import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  siblingCount?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  siblingCount = 1
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) {
      return;
    }
    onPageChange(page);
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];
    const totalNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalNumbers) {
      for (let page = 1; page <= totalPages; page += 1) {
        pages.push(page);
      }
      return pages;
    }

    const leftSiblingIndex = Math.max(safeCurrentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(safeCurrentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    pages.push(1);

    if (showLeftEllipsis) {
      pages.push('ellipsis-left');
    }

    const startPage = showLeftEllipsis ? leftSiblingIndex : 2;
    const endPage = showRightEllipsis ? rightSiblingIndex : totalPages - 1;

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    if (showRightEllipsis) {
      pages.push('ellipsis-right');
    }

    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className={`${styles.pagination} ${className}`.trim()} aria-label="分頁導航">
      <button
        type="button"
        className={styles.navButton}
        onClick={() => handlePageChange(1)}
        disabled={safeCurrentPage === 1}
        aria-label="最前頁"
      >
        {"<<"}
      </button>
      <button
        type="button"
        className={styles.navButton}
        onClick={() => handlePageChange(safeCurrentPage - 1)}
        disabled={safeCurrentPage === 1}
        aria-label="上一頁"
      >
        上一頁
      </button>

      <div className={styles.pageNumbers}>
        {pageNumbers.map((page, index) =>
          typeof page === 'number' ? (
            <button
              type="button"
              key={page}
              className={`${styles.pageButton} ${page === safeCurrentPage ? styles.active : ''}`.trim()}
              onClick={() => handlePageChange(page)}
              aria-current={page === safeCurrentPage ? 'page' : undefined}
              aria-label={`第 ${page} 頁`}
            >
              {page}
            </button>
          ) : (
            <span key={`${page}-${index}`} className={styles.ellipsis} aria-hidden="true">
              ...
            </span>
          )
        )}
      </div>

      <button
        type="button"
        className={styles.navButton}
        onClick={() => handlePageChange(safeCurrentPage + 1)}
        disabled={safeCurrentPage === totalPages}
        aria-label="下一頁"
      >
        下一頁
      </button>
      <button
        type="button"
        className={styles.navButton}
        onClick={() => handlePageChange(totalPages)}
        disabled={safeCurrentPage === totalPages}
        aria-label="最後頁"
      >
        {">>"}
      </button>
    </nav>
  );
};

export default Pagination;
