document.addEventListener('DOMContentLoaded', () => {
    const giftForm = document.getElementById('gift-form');
    const recipientInput = document.getElementById('recipient');
    const occasionSelect = document.getElementById('occasion');
    const messageInput = document.getElementById('message');
    const btnSubmit = document.getElementById('btn-submit');

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

    // Real-time Preview updates
    recipientInput.addEventListener('input', (e) => {
        previewToName.textContent = e.target.value.trim() || 'Someone Special';
    });

    occasionSelect.addEventListener('change', (e) => {
        const text = e.target.options[e.target.selectedIndex].text;
        // strip emoji
        previewOccValue.textContent = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
    });

    function updatePreviewStyle() {
        previewWrapper.className = 'preview-wrapper-container wrap-preview';
        previewWrapper.innerHTML = `
            <div class="box-preview-dummy">
                <div class="box-preview-bow"></div>
            </div>
        `;
    }

    // Initialize preview state
    updatePreviewStyle();

    // Form Submission (AJAX)
    giftForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic validation
        const recipient = recipientInput.value.trim();
        const occasion = occasionSelect.value;
        const wrap_style = 'wrap';
        const gift_item = 'Chosen Gift';
        const message = messageInput.value.trim();

        if (!recipient || !message) {
            alert('Please fill out all required fields!');
            return;
        }

        // Disable button & show loading state
        btnSubmit.disabled = true;
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = `<span>Generating link...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

        try {
            const response = await fetch('/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient,
                    occasion,
                    wrap_style,
                    gift_item,
                    message
                })
            });

            const result = await response.json();

            if (result.success) {
                // Configure modal links
                giftShareLink.value = result.gift_url;
                giftRefCode.value = result.ref_code;
                btnOpenLink.href = result.gift_url;

                // Show modal
                successModal.classList.add('active');
            } else {
                alert(result.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Error generating gift link. Please check your connection.');
        } finally {
            // Restore button
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
    });

    // Copy to clipboard
    btnCopyLink.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(giftShareLink.value);
            // Visual feedback
            const icon = btnCopyLink.querySelector('i');
            icon.className = 'fa-solid fa-check';
            btnCopyLink.style.background = '#10b981'; // Green success color
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                btnCopyLink.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy link: ', err);
            // Fallback select input text
            giftShareLink.select();
            document.execCommand('copy');
        }
    });

    // Copy Reference Code to clipboard
    btnCopyRef.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(giftRefCode.value);
            // Visual feedback
            const icon = btnCopyRef.querySelector('i');
            icon.className = 'fa-solid fa-check';
            btnCopyRef.style.background = '#10b981'; // Green success color
            
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

    // Close modal clicking outside
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('active');
        }
    });
});
