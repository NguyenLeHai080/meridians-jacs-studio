import { registerModuleTranslations } from "../../../core/i18n";
import vn from "./vn";
import en from "./en";
import jp from "./jp";

registerModuleTranslations("auth", {
  vi: vn,
  en,
  jp,
});

export { vn, en, jp };
