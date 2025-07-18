document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const config = {
        totalImages: 40,
        imagesPerLoad: 10,
        categories: ['galaxy', 'nebula', 'planet', 'star', 'black hole', 'supernova'],
        unsplashAccessKey: 'YOUR_UNSPLASH_ACCESS_KEY', // Replace with your Unsplash Access Key
        searchDebounceTime: 300
    };

    // DOM Elements
    const galleryGrid = document.getElementById('galleryGrid');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('closeBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const imageTitle = document.getElementById('imageTitle');
    const imageDescription = document.getElementById('imageDescription');
    const imageAttribution = document.getElementById('imageAttribution');
    const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
    const categoryDropdown = document.getElementById('categoryDropdown');

    // State
    let allImages = [];
    let displayedImages = [];
    let loadedImages = 0;
    let currentImageIndex = 0;
    let isLoading = false;
    let searchTimeout = null;
    let currentCategory = 'all';

    // Initialize the gallery
    async function initGallery() {
        // Initialize particles.js background
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: "#ffffff" },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.4, width: 1 },
                move: { enable: true, speed: 2, direction: "none", random: true, straight: false, out_mode: "out" }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "repulse" },
                    onclick: { enable: true, mode: "push" },
                    resize: true
                }
            }
        });

        try {
            loadingIndicator.style.display = 'flex';
            await generateCategories();
            await generateImageData();
            loadMoreImages();
            setupEventListeners();
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('Error initializing gallery:', error);
            loadingIndicator.innerHTML = '<p>Error loading cosmic images. Please try again later.</p>';
        }
    }

    // Generate dynamic categories
    async function generateCategories() {
        categoryDropdown.innerHTML = '';
        
        // Add 'All' category
        const allBtn = document.createElement('button');
        allBtn.className = 'category-btn active';
        allBtn.dataset.category = 'all';
        allBtn.textContent = 'All';
        allBtn.addEventListener('click', () => filterByCategory('all'));
        categoryDropdown.appendChild(allBtn);
        
        // Add other categories
        config.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = category;
            btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            btn.addEventListener('click', () => filterByCategory(category));
            categoryDropdown.appendChild(btn);
        });
    }

    // Generate image data
    async function generateImageData() {
        // Fetch images for each category
        for (const category of config.categories) {
            const images = await fetchImages(category, Math.ceil(config.totalImages / config.categories.length));
            allImages = [...allImages, ...images];
        }
        
        displayedImages = [...allImages];
    }

    // Fetch images from Unsplash
    async function fetchImages(query, count = 5) {
        try {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?page=1&per_page=${count}&query=${query}+space&client_id=${config.unsplashAccessKey}`
            );
            
            if (!response.ok) throw new Error('Unsplash API error');
            
            const data = await response.json();
            return data.results.map((photo, idx) => ({
                id: photo.id,
                url: photo.urls.regular,
                hdUrl: photo.urls.full,
                category: query,
                title: `Cosmic ${query.charAt(0).toUpperCase() + query.slice(1)} ${idx + 1}`,
                description: photo.description || `Breathtaking view of ${query} in space`,
                photographer: photo.user.name,
                photographerUrl: photo.user.links.html,
                likes: photo.likes,
                color: photo.color || '#363636'
            }));
        } catch (error) {
            console.error(`Error fetching ${query} images:`, error);
            return [];
        }
    }

    // Load more images
    function loadMoreImages() {
        if (isLoading || loadedImages >= displayedImages.length) return;
        
        isLoading = true;
        const fragment = document.createDocumentFragment();
        const endIndex = Math.min(loadedImages + config.imagesPerLoad, displayedImages.length);
        
        for (let i = loadedImages; i < endIndex; i++) {
            const galleryItem = createGalleryItem(displayedImages[i]);
            fragment.appendChild(galleryItem);
        }
        
        galleryGrid.appendChild(fragment);
        loadedImages = endIndex;
        isLoading = false;
    }

    // Create gallery item
    function createGalleryItem(imgData) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.id = imgData.id;
        item.dataset.category = imgData.category;
        item.style.backgroundColor = imgData.color;
        
        const img = document.createElement('img');
        img.src = imgData.url;
        img.alt = imgData.title;
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'image-info';
        info.innerHTML = `
            <h3 class="glowing-title">${imgData.title}</h3>
            <p>${imgData.description}</p>
            <small>❤ ${imgData.likes} likes</small>
        `;
        
        item.append(img, info);
        
        item.addEventListener('click', () => {
            currentImageIndex = displayedImages.findIndex(img => img.id === imgData.id);
            openLightbox(displayedImages[currentImageIndex]);
        });
        
        return item;
    }

    // Open lightbox
    function openLightbox(imgData) {
        lightboxImg.src = imgData.hdUrl || imgData.url;
        lightboxImg.alt = imgData.title;
        imageTitle.textContent = imgData.title;
        imageDescription.textContent = imgData.description;
        imageAttribution.innerHTML = `
            Photo by <a href="${imgData.photographerUrl}" target="_blank">${imgData.photographer}</a> on Unsplash
        `;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Filter by category
    function filterByCategory(category) {
        currentCategory = category;
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // Update dropdown button text
        categoryDropdownBtn.innerHTML = `
            <i class="fas fa-filter"></i> 
            ${category === 'all' ? 'Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
        `;
        
        // Close dropdown
        categoryDropdown.classList.remove('show');
        
        // Filter images
        if (category === 'all') {
            displayedImages = [...allImages];
        } else {
            displayedImages = allImages.filter(img => img.category === category);
        }
        
        // Reset gallery
        galleryGrid.innerHTML = '';
        loadedImages = 0;
        loadMoreImages();
    }

    // Perform search
    function performSearch(query) {
        let filteredImages = currentCategory === 'all' ? [...allImages] : 
            allImages.filter(img => img.category === currentCategory);
        
        if (query) {
            const lowerQuery = query.toLowerCase();
            filteredImages = filteredImages.filter(img => 
                img.title.toLowerCase().includes(lowerQuery) ||
                img.description.toLowerCase().includes(lowerQuery) ||
                img.category.toLowerCase().includes(lowerQuery)
            );
        }
        
        displayedImages = filteredImages;
        galleryGrid.innerHTML = '';
        loadedImages = 0;
        loadMoreImages();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close lightbox
        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        });
        
        // Search functionality
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(searchInput.value.trim());
            }, config.searchDebounceTime);
        });
        
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value.trim());
        });
        
        // Category dropdown
        categoryDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            categoryDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!categoryDropdown.contains(e.target) && e.target !== categoryDropdownBtn) {
                categoryDropdown.classList.remove('show');
            }
        });
        
        // Infinite scroll
        window.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight > scrollHeight - 500 && !isLoading) {
                loadMoreImages();
            }
        });
    }

    // Navigate lightbox
    function navigateLightbox(direction) {
        currentImageIndex = (currentImageIndex + direction + displayedImages.length) % displayedImages.length;
        openLightbox(displayedImages[currentImageIndex]);
    }

    // Initialize the gallery
    initGallery();
});