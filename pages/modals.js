/**
 * ========================================
 * Modals
 * ========================================
 */

window.Modals = {
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

    root.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal-panel" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3 class="modal-title">${window.AppHelpers.esc(title || '')}</h3>
            <button type="button" class="icon-btn" data-modal-close>
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
  },

  close: function() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
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
