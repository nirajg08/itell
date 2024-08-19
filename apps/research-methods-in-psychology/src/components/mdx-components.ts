import { Accordion, AccordionItem } from "./ui/accordion";
import { BlockquoteWrapper } from "./ui/blockquote";
import { Callout } from "./ui/callout";
import { ImageWrapper } from "./ui/image";
import { Question } from "./ui/question";

export const TextbookComponents = {
	"i-image": ImageWrapper,
	"i-question": Question,
	"i-blockquote": BlockquoteWrapper,
	"i-callout": Callout,
	"i-accordion": Accordion,
	"i-accordion-item": AccordionItem,
};