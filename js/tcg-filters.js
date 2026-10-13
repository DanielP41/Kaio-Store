/* Kaio-Store TCG Filters */
(() => {
    const FILTER_LABELS = {
        all: 'Centro TCG',
        yugioh: 'Yu-Gi-Oh!',
        magic: 'Magic: The Gathering',
        onepiece: 'One Piece',
        digimon: 'Digimon',
        riftbound: 'Riftbound',
        accesorios: 'Accesorios'
    };

    const setChipState = (buttons, activeFilter) => {
        buttons.forEach((button) => {
            const isActive = button.dataset.tcgFilter === activeFilter;
            button.classList.toggle('filter-chip-active', isActive);
            button.classList.toggle('filter-chip', !isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    };

    const updateSummary = (summary, filter, visibleCount) => {
        if (!summary) return;

        if (filter === 'all') {
            summary.textContent = 'Mostrando todos los productos de Centro TCG.';
            return;
        }

        const noun = visibleCount === 1 ? 'producto' : 'productos';
        summary.textContent = `Mostrando ${visibleCount} ${noun} de ${FILTER_LABELS[filter]}.`;
    };

    const applyFilter = (cards, buttons, summary, filter) => {
        let visibleCount = 0;

        cards.forEach((card) => {
            const shouldShow = filter === 'all' || card.dataset.tcgCategory === filter;
            card.classList.toggle('tcg-card-hidden', !shouldShow);
            if (shouldShow) visibleCount += 1;
        });

        setChipState(buttons, filter);
        updateSummary(summary, filter, visibleCount);
    };

    const initTCGFilters = () => {
        const chipContainer = document.getElementById('tcgFilterChips');
        const summary = document.getElementById('tcgFilterSummary');
        if (!chipContainer || chipContainer.dataset.ready === 'true') return;

        const cards = Array.from(document.querySelectorAll('[data-tcg-card]'));
        const buttons = Array.from(chipContainer.querySelectorAll('[data-tcg-filter]'));
        if (!cards.length || !buttons.length) return;

        chipContainer.dataset.ready = 'true';

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                applyFilter(cards, buttons, summary, button.dataset.tcgFilter || 'all');
            });
        });

        applyFilter(cards, buttons, summary, 'all');
    };

    document.addEventListener('DOMContentLoaded', initTCGFilters);
})();
