import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import './PublicLandingPage.css';

function PublicLandingPage() {
  const { slug } = useParams();
  const [landingPage, setLandingPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    loadLandingPage();
  }, [slug]);

  useEffect(() => {
    if (landingPage) {
      // Set SEO meta tags
      document.title = landingPage.seo_title || landingPage.title;

      // Meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = landingPage.seo_description || '';

      // Meta keywords
      if (landingPage.seo_keywords) {
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.name = 'keywords';
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = landingPage.seo_keywords;
      }

      // Initialize GA4 if property ID exists
      if (landingPage.ga4_property_id) {
        initializeGA4(landingPage.ga4_property_id);
        trackPageView(landingPage.ga4_property_id);
      }
    }
  }, [landingPage]);

  const initializeGA4 = (propertyId) => {
    // Check if GA4 script already loaded
    if (window.gtag) return;

    // Extract measurement ID from property ID (format: properties/123456789 -> G-XXXXXXXXX)
    // For now, we'll use a placeholder. In production, you'd configure this properly
    const measurementId = `G-${propertyId.replace('properties/', '')}`;

    // Load GA4 script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId);
  };

  const trackPageView = (propertyId) => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: landingPage.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  };

  const trackEvent = (eventName, eventParams = {}) => {
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  };

  const loadLandingPage = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/public/landing-page/${slug}`);
      setLandingPage(response.data.data.landingPage);
    } catch (err) {
      console.error('Error loading landing page:', err);
      setError(err.response?.data?.error?.message || 'Failed to load landing page');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Track form submission attempt
      trackEvent('form_submit_attempt', {
        landing_page: landingPage.slug,
        form_fields: Object.keys(formData).length
      });

      const payload = {
        ...formData,
        landing_page_id: landingPage.id,
        landing_url: window.location.href,
        referrer_url: document.referrer,
        user_agent: navigator.userAgent
      };

      const response = await axios.post(`${API_URL}/public/leads`, payload);

      if (response.data.success) {
        setSubmitSuccess(true);
        setFormData({});

        // Track successful submission
        trackEvent('lead_capture', {
          landing_page: landingPage.slug,
          lead_id: response.data.data.lead_id
        });

        // Scroll to success message
        setTimeout(() => {
          document.querySelector('.success-message')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setSubmitError(err.response?.data?.error?.message || 'Failed to submit form');

      // Track submission error
      trackEvent('form_submit_error', {
        landing_page: landingPage.slug,
        error: err.response?.data?.error?.code || 'UNKNOWN_ERROR'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleInputChange(field.name, e.target.value),
      required: field.required,
      placeholder: field.placeholder || field.label
    };

    switch (field.type) {
      case 'textarea':
        return <textarea {...commonProps} rows={4} />;
      case 'email':
        return <input {...commonProps} type="email" />;
      case 'tel':
        return <input {...commonProps} type="tel" />;
      case 'number':
        return <input {...commonProps} type="number" />;
      default:
        return <input {...commonProps} type="text" />;
    }
  };

  if (loading) {
    return (
      <div className="public-landing-page loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-landing-page error">
        <div className="error-container">
          <h1>Page Not Found</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!landingPage) {
    return null;
  }

  const themeSettings = landingPage.theme_settings || {};
  const formFields = landingPage.form_fields?.fields || [];

  return (
    <div
      className="public-landing-page"
      style={{
        backgroundColor: themeSettings.backgroundColor || '#ffffff',
        color: themeSettings.textColor || '#333333',
        fontFamily: themeSettings.fontFamily || 'Arial, sans-serif'
      }}
    >
      {/* Hero Section */}
      <section className="hero-section">
        {landingPage.hero_image_url && (
          <div className="hero-image">
            <img src={landingPage.hero_image_url} alt={landingPage.title} />
          </div>
        )}
        <div className="hero-content">
          <h1 className="headline" style={{ color: themeSettings.headingColor || themeSettings.textColor }}>
            {landingPage.headline || landingPage.title}
          </h1>
          {landingPage.subheading && (
            <h2 className="subheadline">{landingPage.subheading}</h2>
          )}
        </div>
      </section>

      {/* Content Sections */}
      {landingPage.content_sections && landingPage.content_sections.length > 0 && (
        <section className="content-sections">
          {landingPage.content_sections.map((section, index) => (
            <div key={index} className={`content-section ${section.layout || 'full-width'}`}>
              {section.heading && <h2>{section.heading}</h2>}
              {section.content && <div dangerouslySetInnerHTML={{ __html: section.content }} />}
              {section.image && (
                <div className="section-image">
                  <img src={section.image} alt={section.heading || 'Section image'} />
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Lead Capture Form */}
      <section className="form-section">
        <div className="form-container">
          {submitSuccess ? (
            <div className="success-message">
              <h2>Thank You!</h2>
              <p>We've received your information and will be in touch soon.</p>
            </div>
          ) : (
            <>
              <h2>Get Started Today</h2>
              {submitError && (
                <div className="submit-error">
                  {submitError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="lead-form">
                {formFields.map((field, index) => (
                  <div key={index} className="form-field">
                    <label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="required">*</span>}
                    </label>
                    {renderFormField(field)}
                  </div>
                ))}

                {/* Honeypot field for bot protection */}
                <input
                  type="text"
                  name="website"
                  style={{ display: 'none' }}
                  tabIndex="-1"
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                  style={{
                    backgroundColor: themeSettings.buttonColor || '#007bff',
                    color: themeSettings.buttonTextColor || '#ffffff'
                  }}
                >
                  {submitting ? 'Submitting...' : landingPage.cta_text || 'Submit'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}

export default PublicLandingPage;
