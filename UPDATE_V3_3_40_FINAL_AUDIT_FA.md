# کوروش نوا — V3.3.40 — ممیزی نهایی فایل

## هویت نسخه
- Version: `3.3.40`
- Android versionCode: `45`
- Package ID: `com.korosh.nova.app`
- EAS Project ID: `b80dab8a-34d3-405e-97da-9c434b6d55ff`
- Runtime Version: `appVersion`

## ممیزی انجام‌شده
- تمام فایل‌های JavaScript/TypeScript پروژه از نظر Syntax/Parser بررسی شدند؛ خطای Syntax پیدا نشد.
- تمام JSONهای پروژه Parse شدند؛ خطای JSON پیدا نشد.
- ارجاع‌های نسبی استاتیک به فایل‌های پروژه بررسی شدند؛ فایل مفقود پیدا نشد.
- نسخه‌های Expo SDK با آخرین patchهای تأییدشدهٔ SDK 54 هم‌راستا شدند: `expo ~54.0.34`، `expo-screen-orientation ~9.0.9`، `expo-crypto ~15.0.9` و `expo-updates ~29.0.17`.
- قبل از فعال‌کردن دوربین اضطراری، مجوز واقعی دوربین درخواست می‌شود.
- Package ID و versionCode بررسی شدند.
- آیکن Android بررسی شد؛ زمینه سفید ندارد و Adaptive Icon زمینه تیره دارد.
- مسیرهای ۷ آیکن نوار پایین بررسی شدند.
- صفحات فرعی اتاق فرمان دارای فلش برگشت اختصاصی هستند.
- ارسال پیامک و تماس اضطراری در پنل مخاطبین به Native Android متصل شد و دیگر فقط Intent به برنامه پیامک/شماره‌گیر نیست.
- متن قدیمیِ نادرست درباره «غیرواقعی بودن دوربین» حذف شد.
- سرویس پخش موسیقی Android به‌صورت صریح در Manifest با foreground service type=`mediaPlayback` ثبت می‌شود.
- پخش زندهٔ دوربین اضطراری به‌صورت شبکهٔ محلی انجام می‌شود و متن رابط کاربری دیگر آن را «سرویس عمومی» جا نمی‌زند.
- منطق EAS Update اصلاح شد: بررسی در شروع/بازگشت به foreground، دریافت Update، اعمال فوری وقتی پخش/هشدار فعال نیست، و نگه‌داشتن Update دریافت‌شده تا پایان پخش یا هشدار.

## EAS Update
در `app.json`:
- `updates.enabled = true`
- `updates.checkAutomatically = ON_LOAD`
- `updates.url` به EAS Update پروژه متصل است.
- `runtimeVersion.policy = appVersion`

کانال‌های EAS:
- `preview`
- `production`

فرمان انتشار Preview:
`eas update --channel preview --message "Korosh Nova preview update"`

فرمان انتشار Production:
`eas update --channel production --message "Korosh Nova production update"`

## نکته مهم برای نوع Update
EAS Update برای تغییرات JavaScript، استایل و Asset مناسب است. تغییرات Native مانند دوربین، سرویس Foreground موسیقی، مجوزهای Android یا Native Module جدید به Build جدید Android نیاز دارند؛ فقط انتشار OTA برای آن‌ها کافی نیست.

## وضعیت اعتبارسنجی
- ZIP نهایی پس از ساخت باید با `unzip -t` بررسی شود.
- TypeScript type-check کامل وابسته به نصب `node_modules` است؛ در محیط ممیزی فعلی نصب npm به دلیل Timeout شبکه کامل نشد، بنابراین خطاهای «module not found» به‌عنوان خطای سورس محسوب نمی‌شوند.
- اجرای APK روی دستگاه واقعی در این محیط انجام نشده و نباید به‌عنوان تست دستگاه ادعا شود.
