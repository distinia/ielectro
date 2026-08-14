import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { GuestApp } from "../core/app.js";
import { CreateSteps } from "./steps.js";
import { CreateBirthday } from "./birthday.js";
import { CreateValidation } from "./validation.js";
import { CreateAvailability } from "./availability.js";
import { CreateRequest } from "./request.js";
document.addEventListener("DOMContentLoaded", async () => {
    new GuestApp();
    const form = document.querySelector("#create-form");
    if (!form) return;
    const config = await Nesh.Request.get("https://account.ielectro.com/data/create.json");
    const sections = (config.sections || [])
        .map((section) => form.querySelector(`.${section.class}`))
        .filter(Boolean);
    const prevButton = document.querySelector(".prev-button");
    const nextButton = document.querySelector(".next-button");
    const createButton = document.querySelector(".create-button");
    const birthday = new CreateBirthday(form);
    const validation = new CreateValidation(form, birthday, config);
    const request = new CreateRequest(form, birthday);
    const availability = new CreateAvailability(form);
    const steps = new CreateSteps(sections, prevButton, nextButton, createButton);
    birthday.generate();
    await validation.load();
    steps.show();
    availability.bind();
    validation.bindClearAuthErrors();
    form.addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.preventDefault();
    });
    form.addEventListener("submit", (event) => event.preventDefault());
    nextButton?.addEventListener("click", () => {
        const sectionConfig = config.sections[steps.currentStep()];
        if (!validation.validateSection(sectionConfig)) return;
        steps.next();
    });
    prevButton?.addEventListener("click", () => steps.previous());
    createButton?.addEventListener("click", async () => {
        if (!validation.validateAll()) return;
        await request.submit();
    });
});
