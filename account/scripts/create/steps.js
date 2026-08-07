export class CreateSteps {
    constructor(sections, prevButton, nextButton, createButton) {
        this.sections = sections;
        this.prevButton = prevButton;
        this.nextButton = nextButton;
        this.createButton = createButton;
        this.currentIndex = 0;
        this.initialize();
    }
    initialize() {
        this.sections.forEach((section, index) => {
            section.classList.add("fade-in");
            section.style.display = index === 0 ? "block" : "none";
        });
    }
    currentSection() {
        return this.sections[this.currentIndex];
    }
    currentStep() {
        return this.currentIndex;
    }
    next() {
        if (this.currentIndex >= this.sections.length - 1) return;
        this.sections[this.currentIndex].style.display = "none";
        this.currentIndex++;
        this.sections[this.currentIndex].style.display = "block";
        this.show();
    }
    previous() {
        if (this.currentIndex <= 0) return;
        this.sections[this.currentIndex].style.display = "none";
        this.currentIndex--;
        this.sections[this.currentIndex].style.display = "block";
        this.show();
    }
    show() {
        this.prevButton.style.display = this.currentIndex === 0 ? "none" : "flex";
        if (this.currentIndex === this.sections.length - 1) {
            this.nextButton.style.display = "none";
            this.createButton.style.display = "flex";
        } else {
            this.nextButton.style.display = "flex";
            this.createButton.style.display = "none";
        }
        document.querySelectorAll(".create-progress-dot").forEach((dot, index) => {
            dot.classList.toggle("is-active", index === this.currentIndex);
        });
    }
}
