/**
 * Modals (مُصلَح)
 * [إصلاح] إضافة دعم مفتاح Escape + aria-labelledby
 */
window.Modals = {
  _escapeHandler: null,

  getRoot: function() {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    return root;
  },

  open: function({ title, body, footer = '' }) {
    const root = this.getRoot();
    const modalId = 'modal-title-' + Date.now();

    root.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="${modalId}">
          <div class="modal-header">
            <h3 class="modal-title" id="${modalId}">${window.AppHelpers.esc(title || '')}</h3>
            <button type="button" class="icon-btn" data-modal-close aria-label="إغلاق">
              ${window.AppIcons.get('close', { size: 18 })}
            </button>
          </div>
          <div class="modal-body">${body || ''}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>
    `;

    root.querySelector('[data-modal-backdrop]').addEventListener('click', (e) => {
      if (e.target.dataset.modalBackdrop !== undefined) {
        this.close();
      }
    });

    root.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // [إصلاح] إغلاق بمفتاح Escape
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', this._escapeHandler);
      }
    };
    document.addEventListener('keydown', this._escapeHandler);

    // [تحسين] التركيز على أول عنصر قابل للتركيز
    const firstFocusable = root.querySelector('input, select, textarea, button');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 50);
    }
  },

  close: function() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';

    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
  },

  confirm: function(title, message, confirmLabel = 'تأكيد', danger = false) {
    return new Promise((resolve) => {
      this.open({
        title,
        body: `<p>${window.AppHelpers.esc(message)}</p>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-cancel>إلغاء</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>
            ${window.AppHelpers.esc(confirmLabel)}
          </button>
        `
      });

      const root = this.getRoot();

      root.querySelector('[data-cancel]').addEventListener('click', () => {
        this.close();
        resolve(false);
      });

      root.querySelector('[data-confirm]').addEventListener('click', () => {
        this.close();
        resolve(true);
      });

      root.querySelector('[data-modal-close]').addEventListener('click', () => {
        resolve(false);
      });
    });
  }
};
