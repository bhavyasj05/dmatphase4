import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getLandingPages, deleteLandingPage } from '../services/api';
import './LandingPagesPage.css';

function LandingPagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPages();
  }, [statusFilter]);

  const loadPages = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') {
        params.publish_status = statusFilter;
      }
      const response = await getLandingPages(params);
      setPages(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await deleteLandingPage(id);
      setPages(pages.filter(p => p.id !== id));
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleEdit = (id) => {
    navigate(`/landing-pages/${id}/edit`);
  };

  const handlePreview = (id) => {
    // Open preview directly from backend to ensure scripts execute properly
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/api/admin/landing-pages/${id}/preview?token=${token}`, '_blank');
  };

  const filteredPages = pages.filter(page => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      page.title?.toLowerCase().includes(query) ||
      page.slug?.toLowerCase().includes(query) ||
      page.headline?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: '#fef3c7', color: '#92400e', label: 'Draft' },
      published: { bg: '#d1fae5', color: '#065f46', label: 'Published' },
    };
    const style = styles[status] || styles.draft;
    return (
      <span
        className="status-badge"
        style={{ background: style.bg, color: style.color }}
      >
        {style.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Landing Pages</h1>
          <p>Create and manage your landing pages</p>
        </div>
        <button
          className="primary-button"
          onClick={() => navigate('/landing-pages/new')}
        >
          + Create Landing Page
        </button>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button
            className={`filter-button ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-button ${statusFilter === 'draft' ? 'active' : ''}`}
            onClick={() => setStatusFilter('draft')}
          >
            Draft
          </button>
          <button
            className={`filter-button ${statusFilter === 'published' ? 'active' : ''}`}
            onClick={() => setStatusFilter('published')}
          >
            Published
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">Loading pages...</div>
      )}

      {error && (
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={loadPages}>Retry</button>
        </div>
      )}

      {!loading && !error && filteredPages.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No landing pages found</h3>
          <p>
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Get started by creating your first landing page'}
          </p>
          {!searchQuery && (
            <button
              className="primary-button"
              onClick={() => navigate('/landing-pages/new')}
            >
              Create Landing Page
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredPages.length > 0 && (
        <div className="pages-grid">
          {filteredPages.map((page) => (
            <div key={page.id} className="page-card">
              <div className="page-card-header">
                <h3>{page.title}</h3>
                {getStatusBadge(page.publish_status)}
              </div>

              <div className="page-card-content">
                {page.headline && (
                  <p className="page-headline">{page.headline}</p>
                )}
                <div className="page-meta">
                  <div className="meta-item">
                    <span className="meta-label">Slug:</span>
                    <span className="meta-value">/{page.slug}</span>
                  </div>
                  {page.publish_status === 'published' && (
                    <div className="meta-item">
                      <span className="meta-label">Public URL:</span>
                      <a
                        href={`/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="meta-value public-link"
                      >
                        /p/{page.slug} ↗
                      </a>
                    </div>
                  )}
                  <div className="meta-item">
                    <span className="meta-label">Created:</span>
                    <span className="meta-value">{formatDate(page.created_at)}</span>
                  </div>
                  {page.published_at && (
                    <div className="meta-item">
                      <span className="meta-label">Published:</span>
                      <span className="meta-value">{formatDate(page.published_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="page-card-actions">
                <button
                  className="action-button secondary"
                  onClick={() => handleEdit(page.id)}
                >
                  Edit
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => handlePreview(page.id)}
                >
                  Preview
                </button>
                <button
                  className="action-button danger"
                  onClick={() => handleDelete(page.id, page.title)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LandingPagesPage;
