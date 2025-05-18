document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const resizeSelect = document.getElementById('resize-option');
    const customWidthInput = document.getElementById('custom-width');
    const customHeightInput = document.getElementById('custom-height');
    const qualityInput = document.getElementById('quality');
    const qualityValueDisplay = document.getElementById('quality-value'); // Corrected ID
    const filenameInput = document.getElementById('new-filename');
    const formatSelect = document.getElementById('format');
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const lockRatioCheckbox = document.getElementById('lock-ratio');
    const aspectRatioDisplay = document.getElementById('aspect-ratio');

    const percentageField = document.getElementById('percentage-field');
    const percentageValueInput = document.getElementById('percentage-value');
    const percentageDisplay = document.getElementById('percentage-display');
    const originalDimensionsDisplay = document.getElementById('original-dimensions');
    const newDimensionsDisplay = document.getElementById('new-dimensions');

    const editorInterface = document.getElementById('editor-interface');
    const previewContainer = document.getElementById('preview-container');
    const spinner = document.getElementById('spinner');
    const customSizeFields = document.getElementById('custom-size-fields');
    const processButton = document.getElementById('process-button');
    const notificationArea = document.getElementById('notification-area');

    let originalImage = new Image();
    let currentImageAspectRatio = 1;
    let isProcessing = false;

    function showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationArea.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
          notification.style.opacity = '1';
          notification.style.transform = 'translateX(0)';
        }, 10);


        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300); // Allow fade out animation to complete
        }, duration);
    }


    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '#5a67d8';
        uploadArea.style.backgroundColor = '#2c3543';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#718096';
        uploadArea.style.backgroundColor = '#4a5568';
    });
    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '#718096';
        uploadArea.style.backgroundColor = '#4a5568';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showNotification('Please upload a valid image file (e.g., JPG, PNG, WebP).', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            originalImage = new Image();
            originalImage.onload = () => {
                currentImageAspectRatio = originalImage.width / originalImage.height;
                previewImageOnCanvas();
                uploadArea.classList.add('hidden');
                editorInterface.style.display = 'flex';
                previewContainer.classList.remove('hidden');
                canvas.classList.remove('hidden');
                updateUIForResizeOption();
                processButton.disabled = false;
                showNotification('Image loaded successfully!', 'success', 2000);
            };
            originalImage.onerror = () => {
                showNotification('Could not load the image. It might be corrupted.', 'error');
                processButton.disabled = true;
            };
            originalImage.src = e.target.result;
        };
        reader.onerror = () => {
            showNotification('Error reading file.', 'error');
            processButton.disabled = true;
        };
        reader.readAsDataURL(file);
    }

    function previewImageOnCanvas() {
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        ctx.drawImage(originalImage, 0, 0);

        if (resizeSelect.value === 'custom') {
            customWidthInput.value = originalImage.width;
            customHeightInput.value = originalImage.height;
            updateAspectRatioText();
            aspectRatioDisplay.classList.remove('hidden');
        } else if (resizeSelect.value === 'percentage') {
            originalDimensionsDisplay.textContent = `${originalImage.width}px × ${originalImage.height}px`;
            updatePercentagePreview();
            aspectRatioDisplay.classList.add('hidden');
        } else if (resizeSelect.value !== 'original') {
            const [w, h] = resizeSelect.value.split('x').map(Number);
            customWidthInput.value = w;
            customHeightInput.value = h;
            aspectRatioDisplay.classList.add('hidden');
        } else { // Original
            customWidthInput.value = originalImage.width;
            customHeightInput.value = originalImage.height;
            aspectRatioDisplay.classList.add('hidden');
        }
    }

    resizeSelect.addEventListener('change', updateUIForResizeOption);

    function updateUIForResizeOption() {
        const option = resizeSelect.value;
        customSizeFields.style.display = (option === 'custom' || (option !== 'percentage' && option !== 'original')) ? 'flex' : 'none';
        percentageField.style.display = option === 'percentage' ? 'flex' : 'none';

        customWidthInput.readOnly = false;
        customHeightInput.readOnly = false;
        aspectRatioDisplay.classList.add('hidden');

        if (!originalImage.src) return;

        if (option === 'custom') {
            customWidthInput.value = customWidthInput.value || originalImage.width; // Keep existing if user typed
            customHeightInput.value = customHeightInput.value || originalImage.height; // Keep existing
            updateAspectRatioText();
            if (customWidthInput.value && customHeightInput.value) {
                 aspectRatioDisplay.classList.remove('hidden');
            }
        } else if (option === 'percentage') {
            originalDimensionsDisplay.textContent = `${originalImage.width}px × ${originalImage.height}px`;
            percentageValueInput.value = 100;
            percentageDisplay.textContent = '100%';
            updatePercentagePreview();
        } else if (option === 'original') {
            customWidthInput.value = originalImage.width;
            customHeightInput.value = originalImage.height;
            // Make them look like they are part of custom fields but read-only for "original"
            customSizeFields.style.display = 'flex';
            customWidthInput.readOnly = true;
            customHeightInput.readOnly = true;
        } else { // Preset dimensions
            const [w, h] = option.split('x').map(Number);
            customWidthInput.value = w;
            customHeightInput.value = h;
            customWidthInput.readOnly = true;
            customHeightInput.readOnly = true;
        }
    }

    customWidthInput.addEventListener('input', () => {
        if (lockRatioCheckbox.checked && originalImage.src && !customWidthInput.readOnly) {
            const newWidth = parseInt(customWidthInput.value);
            if (!isNaN(newWidth) && newWidth > 0) {
                customHeightInput.value = Math.round(newWidth / currentImageAspectRatio);
            } else if (newWidth <= 0) {
                 customHeightInput.value = ''; // Clear if width is invalid
            }
        }
        updateAspectRatioText();
    });

    customHeightInput.addEventListener('input', () => {
        if (lockRatioCheckbox.checked && originalImage.src && !customHeightInput.readOnly) {
            const newHeight = parseInt(customHeightInput.value);
            if (!isNaN(newHeight) && newHeight > 0) {
                customWidthInput.value = Math.round(newHeight * currentImageAspectRatio);
            } else if (newHeight <= 0) {
                customWidthInput.value = ''; // Clear if height is invalid
            }
        }
        updateAspectRatioText();
    });

    lockRatioCheckbox.addEventListener('change', () => {
        if (customWidthInput.value && originalImage.src && !customWidthInput.readOnly) {
            const newWidth = parseInt(customWidthInput.value);
            if (lockRatioCheckbox.checked && !isNaN(newWidth) && newWidth > 0) {
                customHeightInput.value = Math.round(newWidth / currentImageAspectRatio);
            }
            updateAspectRatioText();
        } else if (customHeightInput.value && originalImage.src && !customHeightInput.readOnly && lockRatioCheckbox.checked) {
            // if width is empty but height has value
            const newHeight = parseInt(customHeightInput.value);
             if (!isNaN(newHeight) && newHeight > 0) {
                customWidthInput.value = Math.round(newHeight * currentImageAspectRatio);
            }
            updateAspectRatioText();
        }
    });

    percentageValueInput.addEventListener('input', () => {
        percentageDisplay.textContent = percentageValueInput.value + '%';
        updatePercentagePreview();
    });

    function updatePercentagePreview() {
        if (!originalImage.src) return;
        const percentage = parseInt(percentageValueInput.value) / 100;
        const newWidth = Math.round(originalImage.width * percentage);
        const newHeight = Math.round(originalImage.height * percentage);
        newDimensionsDisplay.textContent = `${Math.max(1,newWidth)}px × ${Math.max(1,newHeight)}px (approx)`;
    }

    qualityInput.addEventListener('input', () => {
        qualityValueDisplay.textContent = qualityInput.value + '%';
    });

    function updateAspectRatioText() {
        if (resizeSelect.value !== 'custom' || customWidthInput.readOnly) {
            aspectRatioDisplay.classList.add('hidden');
            return;
        }
        const w = parseInt(customWidthInput.value);
        const h = parseInt(customHeightInput.value);
        if (w && h && w > 0 && h > 0) {
            const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
            const ratioDivisor = gcd(w, h);
            aspectRatioDisplay.textContent = `Aspect Ratio: ${w/ratioDivisor}:${h/ratioDivisor}`;
            aspectRatioDisplay.classList.remove('hidden');
        } else {
            aspectRatioDisplay.textContent = 'Aspect Ratio: Invalid Dimensions';
            aspectRatioDisplay.classList.remove('hidden');
        }
    }

    processButton.addEventListener('click', () => {
        if (isProcessing) return;

        if (!originalImage.src) {
            showNotification('Please upload an image first.', 'error');
            return;
        }

        isProcessing = true;
        spinner.style.display = 'block';
        processButton.disabled = true;
        processButton.textContent = 'Processing...';

        setTimeout(() => {
            try {
                let targetWidth = originalImage.width;
                let targetHeight = originalImage.height;
                const option = resizeSelect.value;
                const format = formatSelect.value;
                const quality = parseInt(qualityInput.value) / 100;

                if (option === 'percentage') {
                    const percentage = parseInt(percentageValueInput.value) / 100;
                    targetWidth = Math.round(originalImage.width * percentage);
                    targetHeight = Math.round(originalImage.height * percentage);
                } else if (option !== 'original') {
                    if (option === 'custom') {
                        targetWidth = parseInt(customWidthInput.value) || originalImage.width;
                        targetHeight = parseInt(customHeightInput.value) || originalImage.height;
                    } else { // Preset
                        const [w, h] = option.split('x').map(Number);
                        targetWidth = w;
                        targetHeight = h;
                    }
                }

                targetWidth = Math.max(1, targetWidth); // Ensure positive dimensions
                targetHeight = Math.max(1, targetHeight);

                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = targetWidth;
                tempCanvas.height = targetHeight;
                tempCtx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

                const baseFilename = filenameInput.value.trim().replace(/[^a-z0-9_.-]/gi, '-') || 'optimised-image';
                const extension = format === 'image/jpeg' ? '.jpg' : format === 'image/png' ? '.png' : '.webp';
                const filename = baseFilename + extension;

                tempCanvas.toBlob(blob => {
                    if (blob) {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);
                        showNotification('Image optimised and download started!', 'success');
                    } else {
                        showNotification('Error creating image blob. Result might be too large or format unsupported.', 'error');
                    }
                    resetProcessingState();
                }, format, quality);

            } catch (error) {
                console.error("Error processing image:", error);
                showNotification('An unexpected error occurred during processing.', 'error');
                resetProcessingState();
            }
        }, 50);
    });

    function resetProcessingState() {
        spinner.style.display = 'none';
        processButton.disabled = !originalImage.src; // Disable if no image
        processButton.textContent = 'Optimise & Download';
        isProcessing = false;
    }

    // Initial UI setup
    updateUIForResizeOption();
    aspectRatioDisplay.classList.add('hidden');
    processButton.disabled = true; // Disabled until an image is loaded
});