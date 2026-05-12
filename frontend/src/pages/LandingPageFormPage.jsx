import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  publishLandingPage,
  deleteLandingPage,
  getTemplates,
  uploadImage,
  deleteImage,
  API_BASE_URL,
} from '../services/api';
import './LandingPageFormPage.css';

function LandingPageFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    template_id: null,
    headline: '',
    subheading: '',
    body_text: '',
    hero_image_url: '',
    cta_text: 'Submit',
    form_fields: {
      fields: [
        { name: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'Enter your name' },
        { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'your@email.com' },
        { name: 'phone', type: 'tel', label: 'Phone Number', required: false, placeholder: '+1 (555) 000-0000' },
      ],
    },
  });

  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadPage();
    }
  }, [id]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadPage = async () => {
    try {
      setLoading(true);
      const response = await getLandingPage(id);
      setFormData(response.data);
      setSlugEdited(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await getTemplates();
      setTemplates(response.data);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'title' && !slugEdited) {
      const newSlug = generateSlug(value);
      setFormData(prev => ({ ...prev, slug: newSlug }));
    }
  };

  const handleSlugChange = (value) => {
    setSlugEdited(true);
    setFormData(prev => ({ ...prev, slug: value }));
  };

  const handleFieldChange = (index, property, value) => {
    const updatedFields = [...formData.form_fields.fields];
    updatedFields[index] = {
      ...updatedFields[index],
      [property]: value
    };
    setFormData(prev => ({
      ...prev,
      form_fields: { fields: updatedFields }
    }));
  };

  const handleAddField = () => {
    const newField = {
      name: '',
      type: 'text',
      label: '',
      required: false,
      placeholder: ''
    };
    setFormData(prev => ({
      ...prev,
      form_fields: {
        fields: [...prev.form_fields.fields, newField]
      }
    }));
  };

  const handleDeleteField = (index) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    const updatedFields = formData.form_fields.fields.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      form_fields: { fields: updatedFields }
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPG, PNG, GIF, or WebP images only.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      const response = await uploadImage(file);
      const imageUrl = response.data.url;

      setFormData(prev => ({ ...prev, hero_image_url: imageUrl }));
      setImagePreview(imageUrl);
      alert('Image uploaded successfully!');
    } catch (err) {
      setError(err.message);
      alert(`Error uploading image: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!formData.hero_image_url) return;
    if (!confirm('Are you sure you want to remove this image?')) return;

    try {
      setUploadingImage(true);
      await deleteImage(formData.hero_image_url);
      setFormData(prev => ({ ...prev, hero_image_url: '' }));
      setImagePreview(null);
      alert('Image removed successfully!');
    } catch (err) {
      console.error('Error removing image:', err);
      // Even if delete fails, clear from form
      setFormData(prev => ({ ...prev, hero_image_url: '' }));
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);

      if (isEditMode) {
        await updateLandingPage(id, formData);
        alert('Landing page updated successfully!');
      } else {
        const response = await createLandingPage(formData);
        alert('Landing page created successfully!');
        navigate(`/landing-pages/${response.data.id}/edit`);
      }
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!isEditMode) {
      alert('Please save as draft first before publishing.');
      return;
    }

    if (!window.confirm('Are you sure you want to publish this landing page?')) {
      return;
    }

    try {
      setPublishing(true);
      setError(null);
      const response = await publishLandingPage(id);

      // Generate public URL
      const url = response.data?.public_url || `${API_BASE_URL}/public/${formData.slug}`;
      setPublicUrl(url);
      setShowPublishSuccess(true);
    } catch (err) {
      setError(err.message);
      alert(`Error publishing: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      alert('URL copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copied to clipboard!');
    }
  };

  const closePublishModal = () => {
    setShowPublishSuccess(false);
    navigate('/landing-pages');
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this landing page? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteLandingPage(id);
      alert('Landing page deleted successfully!');
      navigate('/landing-pages');
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handlePreview = () => {
    // Open preview directly from backend to ensure scripts execute properly
    const token = localStorage.getItem('token');
    // Open with auth token in URL (backend will need to accept this)
    window.open(`${API_BASE_URL}/api/admin/landing-pages/${id}/preview?token=${token}`, '_blank');
  };

  if (loading) {
    return <div className="page-container">Loading...</div>;
  }

  return (
    <div className="page-container">
      <div className="form-header">
        <div>
          <h1>{isEditMode ? 'Edit Landing Page' : 'Create Landing Page'}</h1>
          <p>Fill in the details for your landing page</p>
        </div>
        {isEditMode && (
          <button
            className="secondary-button"
            onClick={handlePreview}
          >
            👁 Preview
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="form-content">
        {!isEditMode && (
          <div className="form-section">
            <h2>Choose Template</h2>
            <p className="section-description">
              Select a template for your landing page. This will determine the layout and design.
            </p>

            {loadingTemplates ? (
              <div className="templates-loading">
                <div className="loading-spinner"></div>
                <p>Loading templates...</p>
              </div>
            ) : (
              <div className="templates-grid">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`template-card ${formData.template_id === template.id ? 'selected' : ''}`}
                    onClick={() => handleChange('template_id', template.id)}
                  >
                    {template.thumbnail_url && (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="template-thumbnail"
                      />
                    )}
                    <div className="template-info">
                      <h3>{template.name}</h3>
                      <p>{template.description}</p>
                    </div>
                    {formData.template_id === template.id && (
                      <div className="template-selected-badge">✓ Selected</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-section">
          <h2>Page Information</h2>

          <div className="form-field">
            <label htmlFor="title">
              Page Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Free Marketing Guide 2025"
              required
              maxLength={500}
            />
            <p className="field-help">
              Internal name for this landing page. Shown in browser tab.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="slug">
              URL Slug <span className="required">*</span>
            </label>
            <div className="slug-input-group">
              <span className="slug-prefix">/</span>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="free-marketing-guide-2025"
                required
                maxLength={100}
              />
            </div>
            <p className="field-help">
              URL path for this page. Only letters, numbers, and hyphens.
            </p>
          </div>
        </div>

        <div className="form-section">
          <h2>Content</h2>

          <div className="form-field">
            <label htmlFor="headline">Headline</label>
            <input
              type="text"
              id="headline"
              value={formData.headline || ''}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="e.g., Download Your Free Marketing Guide"
              maxLength={500}
            />
            <p className="field-help">
              Main headline displayed at the top of the page.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="subheading">Subheading</label>
            <input
              type="text"
              id="subheading"
              value={formData.subheading || ''}
              onChange={(e) => handleChange('subheading', e.target.value)}
              placeholder="e.g., Learn the latest strategies that drive results"
              maxLength={500}
            />
            <p className="field-help">
              Secondary text below the headline.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="body_text">Body Text</label>
            <textarea
              id="body_text"
              value={formData.body_text || ''}
              onChange={(e) => handleChange('body_text', e.target.value)}
              placeholder="Enter the main content for your landing page..."
              rows={6}
            />
            <p className="field-help">
              Main content area. Can include multiple paragraphs.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="hero_image">Hero Image</label>

            {formData.hero_image_url || imagePreview ? (
              <div className="image-preview-container">
                <img
                  src={imagePreview || formData.hero_image_url}
                  alt="Hero preview"
                  className="image-preview"
                />
                <div className="image-actions">
                  <button
                    type="button"
                    className="remove-image-button"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="image-upload-container">
                <input
                  type="file"
                  id="hero_image"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="image-input"
                />
                <label htmlFor="hero_image" className="image-upload-label">
                  {uploadingImage ? (
                    <>
                      <div className="upload-spinner"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">📁</span>
                      <span>Click to upload image</span>
                      <span className="upload-hint">JPG, PNG, GIF or WebP (max 5MB)</span>
                    </>
                  )}
                </label>
              </div>
            )}

            <p className="field-help">
              Upload an image to display at the top of the landing page.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="cta_text">Call-to-Action Button Text</label>
            <input
              type="text"
              id="cta_text"
              value={formData.cta_text}
              onChange={(e) => handleChange('cta_text', e.target.value)}
              placeholder="e.g., Get Free Guide"
              maxLength={100}
            />
            <p className="field-help">
              Text shown on the form submit button.
            </p>
          </div>
        </div>

        <div className="form-section">
          <h2>Form Configuration</h2>
          <p className="section-description">
            Configure the fields that will appear in your landing page form.
          </p>

          <div className="custom-fields-editor">
            {formData.form_fields.fields.map((field, index) => (
              <div key={index} className="custom-field-item">
                <div className="field-handle">⋮⋮</div>
                <div className="field-inputs">
                  <input
                    type="text"
                    placeholder="Field Name (e.g., name, email)"
                    value={field.name}
                    onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                    className="field-input-small"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g., Full Name)"
                    value={field.label}
                    onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                    className="field-input-medium"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                    className="field-input-small"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="number">Number</option>
                    <option value="url">URL</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Placeholder"
                    value={field.placeholder || ''}
                    onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)}
                    className="field-input-medium"
                  />
                  <label className="field-checkbox">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                    />
                    Required
                  </label>
                </div>
                <div className="field-actions">
                  <button
                    type="button"
                    className="field-delete-button"
                    onClick={() => handleDeleteField(index)}
                    title="Delete field"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="add-field-button"
              onClick={handleAddField}
            >
              + Add Field
            </button>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <div className="actions-left">
          {isEditMode && (
            <button
              className="danger-button"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </div>
        <div className="actions-right">
          <button
            className="secondary-button"
            onClick={() => navigate('/landing-pages')}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Draft'}
          </button>
          {isEditMode && (
            <button
              className="publish-button"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* Publish Success Modal */}
      {showPublishSuccess && (
        <div className="modal-overlay" onClick={closePublishModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎉 Landing Page Published Successfully!</h2>
            </div>
            <div className="modal-body">
              <p>Your landing page is now live and ready to collect leads.</p>

              <div className="public-url-section">
                <label>Public URL:</label>
                <div className="url-display">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="url-input"
                  />
                  <button
                    className="copy-button"
                    onClick={copyToClipboard}
                  >
                    📋 Copy URL
                  </button>
                </div>
              </div>

              <div className="sharing-suggestions">
                <h3>Share this URL through:</h3>
                <ul>
                  <li>📧 Email campaigns (Mailchimp, SendGrid, etc.)</li>
                  <li>📱 Social media (Facebook, LinkedIn, Twitter, Instagram)</li>
                  <li>💰 Paid advertising (Google Ads, Facebook Ads)</li>
                  <li>📄 QR codes (Business cards, flyers, posters)</li>
                  <li>🌐 Website CTAs and blog posts</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() => {
                  window.open(publicUrl, '_blank');
                }}
              >
                👁 View Landing Page
              </button>
              <button
                className="primary-button"
                onClick={closePublishModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPageFormPage;
