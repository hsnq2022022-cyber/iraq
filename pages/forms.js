/**
 * ========================================
 * Forms Helper
 * ========================================
 */

window.Forms = {
  get: function(form) {
    const formData = new FormData(form);
    const result = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        result[key] = value;
      } else {
        result[key] = String(value ?? '').trim();
      }
    }

    // checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      result[checkbox.name] = checkbox.checked;
    });

    return result;
  },

  validate: function(form) {
    let valid = true;

    form.querySelectorAll('[required]').forEach((field) => {
      if (!field.value || String(field.value).trim() === '') {
        field.style.borderColor = '#EF4444';
        valid = false;
      } else {
        field.style.borderColor = '';
      }
    });

    return valid;
  },

  setFieldError: function(field, message) {
    field.style.borderColor = '#EF4444';
    window.AppHelpers.toast(message, 'error');
  }
};
