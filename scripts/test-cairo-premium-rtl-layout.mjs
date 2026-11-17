import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync("src/"+p,"utf8");
const first=read("lib/cairo-premium-pdf.ts");
const pages=read("lib/cairo-premium-pages.ts");
const arabic=read("lib/arabic-pdf.ts");
const english=read("lib/workers-pdf.ts");
const assets=read("lib/cairo-premium-assets.ts");

assert.match(arabic,/@fontsource\/cairo\/files\/cairo-arabic-400-normal[.]woff[?]inline/);
assert.match(arabic,/@fontsource\/cairo\/files\/cairo-arabic-700-normal[.]woff[?]inline/);
assert.doesNotMatch(arabic,/@fontsource\/ibm-plex-sans-arabic/);
assert.match(arabic,/drawArabicText/,"RTL shaping continues with full Arabic script font");
assert.match(first,/arabic\(page,"القاهرة بلازا"/);
assert.match(first,/y:112,width:W,height:480/,"Compact cover features larger authentic building image");
assert.match(assets,/facadePortrait/);
assert.match(first,/function cover\(/);
assert.match(first,/function overview\(/);
for(const phrase of [
 "الماستر بلان الأصلي",
 "من بروشور المشروع الأصلي",
 "عرض استرشادي يخضع لتوافر الوحدة",
 "لا يتم حفظ عروض الأسعار",
 "الرسومات للتعريف بالمشروع"
]) {
 assert.ok(!first.includes(phrase),`Forbidden text was reintroduced in prelude: ${phrase}`);
 assert.ok(!pages.includes(phrase),`Forbidden text was reintroduced in offer body: ${phrase}`);
}
assert.match(pages,/function unitPage\(/);
assert.match(pages,/function financialPages\(/);
assert.match(pages,/drawEngineeringLocation/,"Live, approved CAD diagram is still used");
assert.match(english,/drawEngineeringLocation:location [\s\S]*?cairoLocation\(page,location,frame\)/);
assert.match(arabic,/drawEngineeringLocation:location [\s\S]*?cairoLocation\(page,location,frame\)/);
assert.match(pages,/unit\.foodPricing/,"Verified restaurant indoor/outdoor pricing preserved");
assert.match(pages,/formatMoney\(unit\.price\)/,"No hardcoded unit price");
assert.match(pages,/for\(const \[index,s\]of schedules\.entries\(\)\)/,"All selected schedules render");
assert.match(pages,/paymentRow\(page,y,i,item,fonts,lang\)/,"Every payment row renders");
assert.match(pages,/const due=item\.due\|\|"-"/,"Maintenance remains undated");
assert.match(english,/if\(cairoPremium\)\{[\s\S]+?addCairoPremiumDetailPages[\s\S]+?return pdf\.save/);
assert.match(arabic,/if\(cairoPremium\)\{[\s\S]+?addCairoPremiumDetailPages[\s\S]+?return pdf\.save/);
assert.match(first,/p\.drawRectangle\(\{x:0,y:0,width:W,height:49,color:CAIRO_NAVY\}\)/,
 "Bottom navy footer replaces old legal text and has clear page number space");
assert.match(first,/addCairoPremiumPageNumbers/);
console.log("PASS: readable Cairo Arabic font, compact cover, no user-rejected text, consistent premium full-PDF unit/plan/installment pages, finance parity, no footer collision");
