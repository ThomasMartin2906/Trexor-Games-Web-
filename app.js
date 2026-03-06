document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Data Initialization & Rendering ---
    // Requirement 4: Manipulate the server response in the client side
    const gamesContainer = document.getElementById('gamesContainer');
    let allGames = [];

    const renderGames = (games) => {
        if (games.length === 0) {
            gamesContainer.innerHTML = '<div class="loading" style="grid-column: 1 / -1">No games found for this category.</div>';
            return;
        }

        gamesContainer.innerHTML = '';
        games.forEach(game => {
            // Decide badge color based on text
            let badgeClass = 'g-badge';
            if (game.badges[0].includes('RAY-TRACED') || game.badges[0].includes('AUDIO')) {
                badgeClass += ' g-badge-gold';
            } else if (game.badges[0].includes('LATENCY') || game.badges[0].includes('RANKED')) {
                badgeClass += ' g-badge-blue';
            }

            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div class="g-badges">
                    <span class="${badgeClass}">${game.badges[0]}</span>
                </div>
                <h3>${game.title}</h3>
                <span class="game-genre">${game.genre}</span>
                <p>${game.description}</p>
                <div class="game-footer">
                    <button class="play-btn">PLAY NOW</button>
                    ${game.footerBadge ? `<span class="game-footer-badge">${game.footerBadge}</span>` : ''}
                </div>
            `;
            gamesContainer.appendChild(card);
        });
    };

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/games');
            if (!res.ok) throw new Error("Server response wasn't OK");
            const data = await res.json();
            allGames = data;
            renderGames(allGames);
        } catch (err) {
            console.error('Error fetching games:', err);
            gamesContainer.innerHTML = '<div class="loading" style="color:#e74c3c;">Failed to load games. Please ensure Node.js server is running.</div>';
        }
    };

    fetchGames();

    // --- 2. Category Filtering ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update Active State
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Filter Array
            const filterValue = e.target.getAttribute('data-filter');
            if (filterValue === 'all') {
                renderGames(allGames);
            } else {
                const filtered = allGames.filter(g => g.category === filterValue);
                renderGames(filtered);
            }
        });
    });

    // --- 3. Contact Form Controller ---
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: document.getElementById('c-name').value,
            email: document.getElementById('c-email').value,
            type: document.getElementById('c-type').value,
            message: document.getElementById('c-msg').value
        };

        const suBMitBtn = contactForm.querySelector('.btn-submit');
        suBMitBtn.textContent = 'SENDING...';

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                formSuccess.style.display = 'block';
                formError.style.display = 'none';
                contactForm.reset();
                setTimeout(() => { formSuccess.style.display = 'none'; }, 5000);
            } else {
                throw new Error("Failed to post");
            }
        } catch (err) {
            console.error('Error saving message:', err);
            formError.style.display = 'block';
            formSuccess.style.display = 'none';
        } finally {
            suBMitBtn.textContent = 'SEND MESSAGE';
        }
    });

    // --- 4. Scroll Spy Navigation ---
    const sections = document.querySelectorAll("section");
    const navLi = document.querySelectorAll(".nav-links li a");
    window.onscroll = () => {
        var current = "";
        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            if (scrollY >= sectionTop - 100) {
                current = section.getAttribute("id");
            }
        });

        navLi.forEach((li) => {
            li.classList.remove("active");
            if (li.getAttribute('href').includes(current)) {
                li.classList.add("active");
            }
        });
    };
});
