window.EntitySelect = {
  init(containerId, options, selectedIds, onUpdate) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let selected = [...selectedIds];

    const render = () => {
      const selectedItems = options.filter(o => selected.includes(o.id));
      const unselectedItems = options.filter(o => !selected.includes(o.id));

      let html = `
        <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-surface); overflow: visible; position: relative;">
          
          <div style="padding: 8px; display: flex; flex-wrap: wrap; gap: 6px; min-height: 40px;" id="${containerId}-pills">
            ${selectedItems.map(item => `
              <div style="display: flex; align-items: center; gap: 6px; background: var(--accent); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                <i data-lucide="${item.icon || 'file-text'}" style="width: 12px; height: 12px;"></i>
                <span style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.esc(item.title)}</span>
                <div style="cursor: pointer; display: flex; align-items: center; opacity: 0.8;" class="remove-pill" data-id="${item.id}">
                  <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                </div>
              </div>
            `).join('')}
            <input type="text" id="${containerId}-input" placeholder="${selectedItems.length === 0 ? 'Нажмите чтобы выбрать...' : ''}" style="flex: 1; min-width: 150px; border: none; background: transparent; outline: none; font-size: 13px; color: var(--text-primary); padding: 4px;" autocomplete="off" />
          </div>

          <div id="${containerId}-dropdown" class="hidden" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 4px;">
            <div id="${containerId}-list"></div>
          </div>
        </div>
      `;

      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();

      const input = document.getElementById(`${containerId}-input`);
      const dropdown = document.getElementById(`${containerId}-dropdown`);
      const list = document.getElementById(`${containerId}-list`);

      const renderDropdown = (query = '') => {
        const q = query.toLowerCase();
        const filtered = unselectedItems.filter(o => o.title.toLowerCase().includes(q));
        
        if (filtered.length === 0) {
          list.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">Ничего не найдено</div>`;
          return;
        }

        list.innerHTML = filtered.map(item => `
          <div class="es-dropdown-item" data-id="${item.id}" style="padding: 8px 12px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border-light);">
            <i data-lucide="${item.icon || 'file-text'}" style="width: 14px; height: 14px; color: var(--accent);"></i>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${this.esc(item.title)}</span>
          </div>
        `).join('');
        
        if (window.lucide) window.lucide.createIcons();

        // Hover & Click events
        list.querySelectorAll('.es-dropdown-item').forEach(el => {
          el.addEventListener('mouseenter', () => el.style.background = 'var(--bg-body)');
          el.addEventListener('mouseleave', () => el.style.background = 'transparent');
          el.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent input blur
            selected.push(el.dataset.id);
            onUpdate(selected);
            render();
            // Re-focus input and show dropdown again
            setTimeout(() => {
              const newInput = document.getElementById(`${containerId}-input`);
              if(newInput) {
                newInput.focus();
                document.getElementById(`${containerId}-dropdown`).classList.remove('hidden');
              }
            }, 50);
          });
        });
      };

      // Input events
      input.addEventListener('focus', () => {
        dropdown.classList.remove('hidden');
        renderDropdown(input.value);
      });
      
      input.addEventListener('blur', () => {
        setTimeout(() => dropdown.classList.add('hidden'), 200);
      });

      input.addEventListener('input', (e) => {
        renderDropdown(e.target.value);
      });

      // Remove pill events
      container.querySelectorAll('.remove-pill').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selected = selected.filter(id => id !== btn.dataset.id);
          onUpdate(selected);
          render();
        });
      });
    };

    render();
  },

  esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
