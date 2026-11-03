/**
 * The practice round: a real past daily chapter (in the app it is saved like any game, so its stars move into an
 * account at sign-up). Psalm 127 is five verses, read in well under a minute, and the guesses towards it tell a story
 * about houses. The id is the local passage service's (15 April 2025).
 * @since 3rd November 2026
 */
export const PRACTICE = {
    id: 89,
    date: "2025-04-15",
    book: "Psalms",
    chapter: "127",
    summary: "Depend on Yahweh for true success",
    verses: 5,
};

/** The psalm in full (World English Bible, from the passage service): its verses, each as its lines of poetry */
export const CHAPTER = [
    ["Unless Yahweh builds the house,", "they labor in vain who build it.", "Unless Yahweh watches over the city,", "the watchman guards it in vain."],
    ["It is vain for you to rise up early,", "to stay up late,", "eating the bread of toil;", "for he gives sleep to his loved ones."],
    ["Behold, children are a heritage of Yahweh.", "The fruit of the womb is his reward."],
    ["As arrows in the hand of a mighty man,", "so are the children of youth."],
    ["Happy is the man who has his quiver full of them.", "They won’t be disappointed when they speak with their enemies in the gate."],
];

/** Reading time, as Read works it out: well under a minute */
export const READ_MINUTES = 1;

/** The study, cut to one question for the tour */
export const QUESTION = {
    content: "“Unless Yahweh builds the house, they labor…”",
    options: ["in vain who build it", "with joy who build it", "for ever who build it"],
    correct: "in vain who build it",
    because: "Psalm 127:1. Without God, even our hardest work comes to nothing.",
};
