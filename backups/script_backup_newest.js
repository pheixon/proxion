const embedFrame = document.getElementById('embed-frame');
const embedContainer = document.querySelector('.embed-container');

const pages = {
  1: './videos.html',
  2: './collection.html',
  3: './projects.html',
  4: './blog.html',
  5: './socials.html',
  6: './about.html'
};

const container = document.querySelector('.button-container');
const items = document.querySelectorAll('.item');
const firstItem = items[0];

items.forEach((item, index) => {
  // Hover logic (ONLY when not in selected mode)
  item.addEventListener('mouseenter', () => {
    if (!container.classList.contains('selected') && index !== 0) {
      container.classList.add('hovering');
    }
  });

  item.addEventListener('mouseleave', () => {
    container.classList.remove('hovering');
  });

  // Click logic
  item.addEventListener('click', () => {

    const isSelectedMode = container.classList.contains('selected');
    const isAlreadySelected = item.classList.contains('selected');
    const isFirst = item.classList.contains('first');

    // 🚫 Prevent re-clicking the expanded button (except first)
    if (isSelectedMode && isAlreadySelected && !isFirst) {
      return;
    }

    // 🏠 HOME: first button resets everything
    if (isFirst && isSelectedMode) {
      container.classList.remove('selected');
      container.classList.remove('hovering');

      items.forEach(i => {
        i.classList.remove('selected');
        i.classList.remove('active');
      });

      firstItem.classList.add('active');

      embedContainer.classList.remove('active');
      embedFrame.src = '';
      history.pushState(null, "", window.location.pathname);
      return;
    }

    // Ignore first button when already home
    if (isFirst) return;

    // ▶ Enter selected mode
    container.classList.add('selected');
    container.classList.remove('hovering');

    items.forEach(i => {
      i.classList.remove('selected');
      i.classList.remove('active');
    });

    item.classList.add('selected');

    // 🌐 Load iframe ONLY if different
    if (pages[index] && embedFrame.src !== pages[index]) {
      embedContainer.classList.add('fade-out');
      setTimeout(() => {
        embedFrame.src = pages[index];

        embedContainer.classList.remove('fade-out');
        embedContainer.classList.add('active');
        embedContainer.classList.add('fade-in');

        setTimeout(() => {
          embedContainer.classList.remove('fade-in');
        }, 350);

      }, 350);
    }
  });
});
