document.addEventListener('DOMContentLoaded', () => {
    const giftForm = document.getElementById('gift-form');
    const recipientInput = document.getElementById('recipient');
    const occasionSelect = document.getElementById('occasion');
    const messageInput = document.getElementById('message');
    const btnSubmit = document.getElementById('btn-submit');

    // Options UI elements
    const optionsContainer = document.getElementById('options-list-container');
    const btnAddOption = document.getElementById('btn-add-option');
    const previewOptCount = document.getElementById('preview-opt-count');
    const previewOptionsChips = document.getElementById('preview-options-chips');

    // Preview elements
    const previewWrapper = document.getElementById('preview-wrapper-container');
    const previewToName = document.getElementById('preview-to-name');
    const previewOccValue = document.getElementById('preview-occ-value');

    // Modal elements
    const successModal = document.getElementById('success-modal');
    const giftShareLink = document.getElementById('gift-share-link');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const giftRefCode = document.getElementById('gift-ref-code');
    const btnCopyRef = document.getElementById('btn-copy-ref');
    const btnOpenLink = document.getElementById('btn-open-link');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Tracker elements
    const trackForm = document.getElementById('track-form');
    const trackRefInput = document.getElementById('track-ref-input');

    // Real-time Preview updates for Recipient & Occasion
    recipientInput.addEventListener('input', (e) => {
        previewToName.textContent = e.target.value.trim() || 'Someone Special';
    });

    occasionSelect.addEventListener('change', (e) => {
        const text = e.target.options[e.target.selectedIndex].text;
        previewOccValue.textContent = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
    });

    function updatePreviewStyle() {
        if (!previewWrapper) return;
        previewWrapper.className = 'preview-wrapper-container wrap-preview';
        previewWrapper.innerHTML = `
            <div class="box-preview-dummy">
                <div class="box-preview-bow"></div>
            </div>
        `;
    }
    updatePreviewStyle();

    // -------------------------------------------------------------
    // DYNAMIC PRESENTER GIFT OPTIONS LOGIC
    // -------------------------------------------------------------
    function getStoreInfo(url) {
        if (!url) return {
            name: 'Store',
            icon: 'fa-solid fa-cart-shopping',
            badgeClass: 'badge-general',
            color: 'var(--text-secondary)'
        };
        const lower = url.toLowerCase();
        if (lower.includes('flipkart.com') || lower.includes('dl.flipkart')) {
            return {
                name: 'Flipkart',
                icon: 'fa-solid fa-bag-shopping',
                badgeClass: 'badge-flipkart',
                color: '#2874f0'
            };
        }
        if (lower.includes('amazon.') || lower.includes('amzn.')) {
            return {
                name: 'Amazon',
                icon: 'fa-brands fa-amazon',
                badgeClass: 'badge-amazon',
                color: '#ff9900'
            };
        }
        return {
            name: 'Store',
            icon: 'fa-solid fa-arrow-up-right-from-square',
            badgeClass: 'badge-general',
            color: 'var(--text-secondary)'
        };
    }

    let options = [
        {
            id: 'opt_' + Date.now() + '_1',
            title: 'Apple AirPods Pro (2nd Gen)',
            image_url: '/static/images/airpods.png',
            specs: 'Active Noise Cancellation • USB-C • MagSafe Case',
            amazon_link: 'https://www.amazon.in/dp/B0D1XD1ZV3'
        },
        {
            id: 'opt_' + Date.now() + '_2',
            title: 'Sony WH-1000XM5 Headphones',
            image_url: '/static/images/iphone.png',
            specs: 'Ultra-clear calls • 30hr Battery • Auto ANC',
            amazon_link: 'https://www.flipkart.com/sony-wh-1000xm5-bluetooth-headset/p/itm2112a95c99d63'
        }
    ];

    function renderOptions() {
        if (!optionsContainer) return;
        optionsContainer.innerHTML = '';

        options.forEach((opt, index) => {
            const card = document.createElement('div');
            card.className = 'option-item-card';
            card.dataset.id = opt.id;
            const store = getStoreInfo(opt.amazon_link);

            card.innerHTML = `
                <div class="option-item-header">
                    <div class="option-number-badge">
                        <i class="fa-solid fa-gift"></i> Choice #${index + 1}
                    </div>
                    ${options.length > 1 ? `
                        <button type="button" class="btn-remove-option" title="Remove this choice">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    ` : ''}
                </div>

                <div class="option-fields">
                    <!-- Title Input -->
                    <div class="option-field-group">
                        <label><i class="fa-solid fa-tag"></i> Item Name <span class="req">*</span></label>
                        <input type="text" class="input-opt-title" placeholder="e.g. Sony Wireless Headphones" value="${escapeHtml(opt.title)}" required maxlength="80">
                    </div>

                    <!-- Image Upload & Preview -->
                    <div class="option-field-group">
                        <label><i class="fa-regular fa-image"></i> Product Image (Upload or URL)</label>
                        <div class="image-uploader-container">
                            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden-file-input" style="display: none;">
                            
                            <div class="uploader-preview-row">
                                <div class="uploader-thumb-box ${opt.image_url ? 'has-image' : 'empty'}">
                                    ${opt.image_url ? `
                                        <img src="${opt.image_url}" alt="Preview" class="thumb-img">
                                        <button type="button" class="btn-thumb-remove" title="Remove image">&times;</button>
                                    ` : `
                                        <div class="thumb-empty-placeholder">
                                            <i class="fa-solid fa-cloud-arrow-up"></i>
                                            <span>Upload</span>
                                        </div>
                                    `}
                                </div>
                                
                                <div class="uploader-controls">
                                    <button type="button" class="btn btn-sm btn-upload-trigger">
                                        <i class="fa-solid fa-upload"></i> ${opt.image_url ? 'Change Photo' : 'Upload Photo'}
                                    </button>
                                    <span class="uploader-or">or</span>
                                    <input type="url" class="input-opt-image-url" placeholder="Paste Image URL" value="${escapeHtml(opt.image_url)}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Specs Details -->
                    <div class="option-field-group">
                        <label><i class="fa-solid fa-sliders"></i> Specification Details / Features</label>
                        <input type="text" class="input-opt-specs" placeholder="e.g. Color: Space Gray • 256GB • Noise Cancelling" value="${escapeHtml(opt.specs)}">
                    </div>

                    <!-- Amazon / Flipkart Link -->
                    <div class="option-field-group">
                        <label><i class="fa-solid fa-cart-shopping store-icon-accent"></i> Amazon / Flipkart Product Link</label>
                        <div class="amazon-input-wrapper">
                            <span class="amazon-input-badge ${store.badgeClass}"><i class="${store.icon}"></i></span>
                            <input type="url" class="input-opt-amazon" placeholder="https://www.amazon.in/... or https://www.flipkart.com/..." value="${escapeHtml(opt.amazon_link)}">
                        </div>
                    </div>
                </div>
            `;

            // Wire up event listeners for this option card
            const titleInput = card.querySelector('.input-opt-title');
            const specsInput = card.querySelector('.input-opt-specs');
            const amazonInput = card.querySelector('.input-opt-amazon');
            const imageUrlInput = card.querySelector('.input-opt-image-url');
            const fileInput = card.querySelector('.hidden-file-input');
            const uploadBtn = card.querySelector('.btn-upload-trigger');
            const thumbBox = card.querySelector('.uploader-thumb-box');
            const removeBtn = card.querySelector('.btn-remove-option');
            const thumbRemoveBtn = card.querySelector('.btn-thumb-remove');

            // Text inputs updates
            titleInput.addEventListener('input', (e) => {
                opt.title = e.target.value;
                updatePreviewChips();
            });

            specsInput.addEventListener('input', (e) => {
                opt.specs = e.target.value;
                updatePreviewChips();
            });

            amazonInput.addEventListener('input', (e) => {
                opt.amazon_link = e.target.value;
                const badge = card.querySelector('.amazon-input-badge');
                if (badge) {
                    const st = getStoreInfo(opt.amazon_link);
                    badge.className = `amazon-input-badge ${st.badgeClass}`;
                    badge.innerHTML = `<i class="${st.icon}"></i>`;
                }
                updatePreviewChips();
            });

            imageUrlInput.addEventListener('input', (e) => {
                opt.image_url = e.target.value.trim();
                renderOptions();
                updatePreviewChips();
            });

            // Trigger file input
            uploadBtn.addEventListener('click', () => fileInput.click());
            if (!opt.image_url) {
                thumbBox.addEventListener('click', () => fileInput.click());
            }

            if (thumbRemoveBtn) {
                thumbRemoveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    opt.image_url = '';
                    renderOptions();
                    updatePreviewChips();
                });
            }

            // Handle file upload to backend
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file (PNG, JPG, WEBP, GIF).');
                    return;
                }

                uploadBtn.disabled = true;
                uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

                const formData = new FormData();
                formData.append('image', file);

                try {
                    const res = await fetch('/upload-image', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (data.success && data.image_url) {
                        opt.image_url = data.image_url;
                        renderOptions();
                        updatePreviewChips();
                    } else {
                        alert(data.error || 'Failed to upload image.');
                    }
                } catch (err) {
                    console.error('Image upload error:', err);
                    alert('Error uploading image. Please check your connection.');
                } finally {
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Change Photo`;
                }
            });

            // Handle card removal
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    options = options.filter(o => o.id !== opt.id);
                    renderOptions();
                    updatePreviewChips();
                });
            }

            optionsContainer.appendChild(card);
        });

        updatePreviewChips();
    }

    // Add option button
    if (btnAddOption) {
        btnAddOption.addEventListener('click', () => {
            options.push({
                id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                title: '',
                image_url: '',
                specs: '',
                amazon_link: ''
            });
            renderOptions();
            // Scroll to newest option and focus its title input
            const cards = optionsContainer.querySelectorAll('.option-item-card');
            const lastCard = cards[cards.length - 1];
            if (lastCard) {
                lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                const input = lastCard.querySelector('.input-opt-title');
                if (input) input.focus();
            }
        });
    }

    function updatePreviewChips() {
        if (!previewOptCount || !previewOptionsChips) return;
        previewOptCount.textContent = options.length;
        previewOptionsChips.innerHTML = '';

        if (options.length === 0) {
            previewOptionsChips.innerHTML = `<div class="preview-empty-hint">No choices added yet</div>`;
            return;
        }

        options.forEach((opt, idx) => {
            const chip = document.createElement('div');
            chip.className = 'preview-opt-chip';
            const store = getStoreInfo(opt.amazon_link);
            const showStore = opt.amazon_link && opt.amazon_link.trim();
            chip.innerHTML = `
                <div class="chip-img-box">
                    ${opt.image_url ? `<img src="${opt.image_url}" alt="Preview" onerror="this.onerror=null; this.src='/static/images/iphone.png';">` : `<i class="fa-solid fa-gift"></i>`}
                </div>
                <div class="chip-text-box">
                    <span class="chip-title">${escapeHtml(opt.title) || `Choice #${idx + 1}`}</span>
                    ${opt.specs ? `<span class="chip-specs">${escapeHtml(opt.specs)}</span>` : ''}
                    ${showStore ? `<span class="chip-store chip-${store.name.toLowerCase()}"><i class="${store.icon}"></i> ${store.name}</span>` : ''}
                </div>
            `;
            previewOptionsChips.appendChild(chip);
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize options UI
    renderOptions();

    // -------------------------------------------------------------
    // FORM SUBMISSION (AJAX)
    // -------------------------------------------------------------
    giftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const recipient = recipientInput.value.trim();
        const occasion = occasionSelect.value;
        const message = messageInput.value.trim();

        if (!recipient || !message) {
            alert('Please fill out the recipient name and secret message!');
            return;
        }

        // Validate options
        const validOptions = options.map(opt => ({
            title: opt.title.trim(),
            image_url: opt.image_url.trim(),
            specs: opt.specs.trim(),
            amazon_link: opt.amazon_link.trim()
        })).filter(opt => opt.title.length > 0);

        if (validOptions.length === 0) {
            alert('Please add at least one gift choice with a title for your recipient!');
            return;
        }

        btnSubmit.disabled = true;
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = `<span>Generating magical link...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

        try {
            const response = await fetch('/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient,
                    occasion,
                    wrap_style: 'wrap',
                    gift_item: 'Pending Selection',
                    message,
                    options: validOptions
                })
            });

            const result = await response.json();

            if (result.success) {
                giftShareLink.value = result.gift_url;
                giftRefCode.value = result.ref_code;
                btnOpenLink.href = result.gift_url;
                successModal.classList.add('active');
            } else {
                alert(result.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Error generating gift link. Please check your connection.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
    });

    // Copy to clipboard
    btnCopyLink.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(giftShareLink.value);
            const icon = btnCopyLink.querySelector('i');
            icon.className = 'fa-solid fa-check';
            btnCopyLink.style.background = '#10b981';
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                btnCopyLink.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy link: ', err);
            giftShareLink.select();
            document.execCommand('copy');
        }
    });

    // Copy Reference Code to clipboard
    btnCopyRef.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(giftRefCode.value);
            const icon = btnCopyRef.querySelector('i');
            icon.className = 'fa-solid fa-check';
            btnCopyRef.style.background = '#10b981';
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                btnCopyRef.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy reference code: ', err);
            giftRefCode.select();
            document.execCommand('copy');
        }
    });

    // Tracker Form submission redirect
    if (trackForm) {
        trackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const refCode = trackRefInput.value.trim().toUpperCase();
            if (refCode.length === 6) {
                window.location.href = `/status/${refCode}`;
            } else {
                alert('Please enter a valid 6-character Reference Number!');
            }
        });
    }

    // Close Modal
    modalCloseBtn.addEventListener('click', () => {
        successModal.classList.remove('active');
    });

    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('active');
        }
    });
});
