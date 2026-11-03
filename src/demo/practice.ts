/**
 * The practice round: a real past daily chapter (in the app it is saved like any game, so its stars move
 * into an account at sign-up). Jonah 1 names its book in the clue, so a newcomer can find it, but rarely on the first
 * guess, so they see how the readings narrow it down. The id is the local passage service's (22 November 2025).
 * @since 3rd November 2026
 */
export const PRACTICE = {
    id: 198,
    date: "2025-11-22",
    book: "Jonah",
    chapter: "1",
    summary: "Jonah flees from God and is swallowed",
    verses: 17,
};

/** The chapter in full (World English Bible, from the passage service), shown in Read */
export const CHAPTER = [
    "Now Yahweh’s word came to Jonah the son of Amittai, saying,",
    "“Arise, go to Nineveh, that great city, and preach against it, for their wickedness has come up before me.”",
    "But Jonah rose up to flee to Tarshish from the presence of Yahweh. He went down to Joppa, and found a ship going to Tarshish; so he paid its fare, and went down into it, to go with them to Tarshish from the presence of Yahweh.",
    "But Yahweh sent out a great wind on the sea, and there was a mighty storm on the sea, so that the ship was likely to break up.",
    "Then the mariners were afraid, and every man cried to his god. They threw the cargo that was in the ship into the sea to lighten the ship. But Jonah had gone down into the innermost parts of the ship, and he was laying down, and was fast asleep.",
    "So the ship master came to him, and said to him, “What do you mean, sleeper? Arise, call on your God! Maybe your God will notice us, so that we won’t perish.”",
    "They all said to each other, “Come, let us cast lots, that we may know who is responsible for this evil that is on us.” So they cast lots, and the lot fell on Jonah.",
    "Then they asked him, “Tell us, please, for whose cause this evil is on us. What is your occupation? Where do you come from? What is your country? Of what people are you?”",
    "He said to them, “I am a Hebrew, and I fear Yahweh, the God of heaven, who has made the sea and the dry land.”",
    "Then the men were exceedingly afraid, and said to him, “What have you done?” For the men knew that he was fleeing from the presence of Yahweh, because he had told them.",
    "Then they said to him, “What shall we do to you, that the sea may be calm to us?” For the sea grew more and more stormy.",
    "He said to them, “Take me up, and throw me into the sea. Then the sea will be calm for you; for I know that because of me this great storm is on you.”",
    "Nevertheless the men rowed hard to get them back to the land; but they could not, for the sea grew more and more stormy against them.",
    "Therefore they cried to Yahweh, and said, “We beg you, Yahweh, we beg you, don’t let us die for this man’s life, and don’t lay on us innocent blood; for you, Yahweh, have done as it pleased you.”",
    "So they took up Jonah, and threw him into the sea; and the sea ceased its raging.",
    "Then the men feared Yahweh exceedingly; and they offered a sacrifice to Yahweh, and made vows.",
    "Yahweh prepared a great fish to swallow up Jonah, and Jonah was in the belly of the fish three days and three nights.",
];

/** Reading time, as Read works it out, and how long a chapter a day takes to cover the Bible's 1,189 chapters */
export const READ_MINUTES = 2;
export const BIBLE_YEARS = "just over three years";

/** The study, as the app asks it: four questions about the chapter, then a summary, which counts as the fifth */
export const QUESTIONS = [
    { content: "Where did God send Jonah?", options: ["Tarshish", "Nineveh", "Joppa"], correct: "Nineveh",
      because: "Jonah 1:2: “Arise, go to Nineveh, that great city.” He fled to Tarshish instead." },
    { content: "Where did Jonah find a ship?", options: ["Joppa", "Nineveh", "Tarshish"], correct: "Joppa",
      because: "Jonah 1:3: “He went down to Joppa, and found a ship going to Tarshish.”" },
    { content: "What was Jonah doing during the storm?", options: ["Praying on deck", "Fast asleep below deck", "Bailing out water"], correct: "Fast asleep below deck",
      because: "Jonah 1:5: he “had gone down into the innermost parts of the ship … and was fast asleep.”" },
    { content: "How did the sailors learn the storm was Jonah’s fault?", options: ["A dream", "They cast lots", "Jonah confessed first"], correct: "They cast lots",
      because: "Jonah 1:7: “So they cast lots, and the lot fell on Jonah.”" },
];
export const SUMMARY = { content: "Sum up Jonah 1 in a sentence of your own.", placeholder: "Jonah runs from God, but…" };
