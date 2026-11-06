/** Stand-in for the webapp's server action: the Bible's structure, from the wizard's copy of the passage service's */
import bible from "@/demo/bible.json";

export default async function getBible(): Promise<any> { return bible; }
