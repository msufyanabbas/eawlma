export interface District {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Region {
  id: string;
  nameAr: string;
  nameEn: string;
  districts: District[];
}

export interface City {
  id: string;
  nameAr: string;
  nameEn: string;
  regions: Region[];
}

export const SAUDI_CITIES: City[] = [
  {
    id: 'riyadh',
    nameAr: 'الرياض',
    nameEn: 'Riyadh',
    regions: [
      {
        id: 'north-riyadh',
        nameAr: 'شمال الرياض',
        nameEn: 'North Riyadh',
        districts: [
          { id: 'al-olaya', nameAr: 'العليا', nameEn: 'Al Olaya' },
          { id: 'al-malqa', nameAr: 'الملقا', nameEn: 'Al Malqa' },
          { id: 'al-nakheel', nameAr: 'النخيل', nameEn: 'Al Nakheel' },
          { id: 'al-yasmin', nameAr: 'الياسمين', nameEn: 'Al Yasmin' },
          { id: 'al-gulf', nameAr: 'الخليج', nameEn: 'Al Gulf' },
          { id: 'al-hamra', nameAr: 'الحمراء', nameEn: 'Al Hamra' },
          { id: 'al-rawdah', nameAr: 'الروضة', nameEn: 'Al Rawdah' },
          { id: 'al-wurud', nameAr: 'الورود', nameEn: 'Al Wurud' },
          { id: 'hittin', nameAr: 'حطين', nameEn: 'Hittin' },
          { id: 'al-nada', nameAr: 'الندى', nameEn: 'Al Nada' },
        ],
      },
      {
        id: 'south-riyadh',
        nameAr: 'جنوب الرياض',
        nameEn: 'South Riyadh',
        districts: [
          { id: 'al-shabab', nameAr: 'الشباب', nameEn: 'Al Shabab' },
          { id: 'al-jaradiyah', nameAr: 'الجارودية', nameEn: 'Al Jaradiyah' },
          { id: 'al-mansoorah', nameAr: 'المنصورة', nameEn: 'Al Mansoorah' },
          { id: 'al-salam', nameAr: 'السلام', nameEn: 'Al Salam' },
          { id: 'al-naseem-south', nameAr: 'النسيم الجنوبي', nameEn: 'Al Naseem South' },
          { id: 'al-aziziyah', nameAr: 'العزيزية', nameEn: 'Al Aziziyah' },
          { id: 'al-dar-albaida', nameAr: 'الدار البيضاء', nameEn: 'Al Dar Al Baida' },
          { id: 'al-fayha', nameAr: 'الفيحاء', nameEn: 'Al Fayha' },
        ],
      },
      {
        id: 'east-riyadh',
        nameAr: 'شرق الرياض',
        nameEn: 'East Riyadh',
        districts: [
          { id: 'al-naseem-east', nameAr: 'النسيم الشرقي', nameEn: 'Al Naseem East' },
          { id: 'al-rimal', nameAr: 'الرمال', nameEn: 'Al Rimal' },
          { id: 'al-murabba', nameAr: 'المربع', nameEn: 'Al Murabba' },
          { id: 'al-manfuhah', nameAr: 'المنفوحة', nameEn: 'Al Manfuhah' },
          { id: 'al-dilam', nameAr: 'الدلم', nameEn: 'Al Dilam' },
          { id: 'al-hailanah', nameAr: 'الحيلانة', nameEn: 'Al Hailanah' },
        ],
      },
      {
        id: 'west-riyadh',
        nameAr: 'غرب الرياض',
        nameEn: 'West Riyadh',
        districts: [
          { id: 'al-rabwah', nameAr: 'الربوة', nameEn: 'Al Rabwah' },
          { id: 'al-suwaidi', nameAr: 'السويدي', nameEn: 'Al Suwaidi' },
          { id: 'al-faisaliyah', nameAr: 'الفيصلية', nameEn: 'Al Faisaliyah' },
          { id: 'al-nadheem', nameAr: 'النظيم', nameEn: 'Al Nadheem' },
          { id: 'al-shifa', nameAr: 'الشفا', nameEn: 'Al Shifa' },
          { id: 'al-bayan', nameAr: 'البيان', nameEn: 'Al Bayan' },
          { id: 'dahiyat-namar', nameAr: 'ضاحية نمار', nameEn: 'Dahiyat Namar' },
        ],
      },
      {
        id: 'central-riyadh',
        nameAr: 'وسط الرياض',
        nameEn: 'Central Riyadh',
        districts: [
          { id: 'al-bathaa', nameAr: 'البطحاء', nameEn: 'Al Bathaa' },
          { id: 'al-dirah', nameAr: 'الديرة', nameEn: 'Al Dirah' },
          { id: 'al-madinah-almunawarah', nameAr: 'المدينة المنورة', nameEn: 'Al Madinah Road' },
          { id: 'al-qirawan', nameAr: 'القيروان', nameEn: 'Al Qirawan' },
          { id: 'al-sulaimaniyah', nameAr: 'السليمانية', nameEn: 'Al Sulaimaniyah' },
          { id: 'al-malaz', nameAr: 'الملز', nameEn: 'Al Malaz' },
          { id: 'al-mursalat', nameAr: 'المرسلات', nameEn: 'Al Mursalat' },
        ],
      },
    ],
  },
  {
    id: 'jeddah',
    nameAr: 'جدة',
    nameEn: 'Jeddah',
    regions: [
      {
        id: 'north-jeddah',
        nameAr: 'شمال جدة',
        nameEn: 'North Jeddah',
        districts: [
          { id: 'al-zahra', nameAr: 'الزهراء', nameEn: 'Al Zahra' },
          { id: 'al-rawdah-jeddah', nameAr: 'الروضة', nameEn: 'Al Rawdah' },
          { id: 'al-murjan', nameAr: 'المرجان', nameEn: 'Al Murjan' },
          { id: 'al-nuzlah-yamania', nameAr: 'النزلة اليمانية', nameEn: 'Al Nuzlah Yamania' },
          { id: 'al-shati', nameAr: 'الشاطئ', nameEn: 'Al Shati' },
          { id: 'al-naeem', nameAr: 'النعيم', nameEn: 'Al Naeem' },
          { id: 'al-marwah', nameAr: 'المروة', nameEn: 'Al Marwah' },
          { id: 'obhur-north', nameAr: 'أبحر الشمالية', nameEn: 'Obhur North' },
        ],
      },
      {
        id: 'south-jeddah',
        nameAr: 'جنوب جدة',
        nameEn: 'South Jeddah',
        districts: [
          { id: 'al-nuzlah-sharqiyah', nameAr: 'النزلة الشرقية', nameEn: 'Al Nuzlah Sharqiyah' },
          { id: 'al-thaalibah', nameAr: 'الثعالبة', nameEn: 'Al Thaalibah' },
          { id: 'al-naseem-jeddah', nameAr: 'النسيم', nameEn: 'Al Naseem' },
          { id: 'al-sabil', nameAr: 'السبيل', nameEn: 'Al Sabil' },
          { id: 'al-nakhil-jeddah', nameAr: 'النخيل', nameEn: 'Al Nakhil' },
          { id: 'al-salhiyah', nameAr: 'الصالحية', nameEn: 'Al Salhiyah' },
        ],
      },
      {
        id: 'central-jeddah',
        nameAr: 'وسط جدة',
        nameEn: 'Central Jeddah',
        districts: [
          { id: 'al-balad', nameAr: 'البلد', nameEn: 'Al Balad' },
          { id: 'al-hindawiyah', nameAr: 'الهنداوية', nameEn: 'Al Hindawiyah' },
          { id: 'al-andalus', nameAr: 'الأندلس', nameEn: 'Al Andalus' },
          { id: 'al-hamrah-jeddah', nameAr: 'الحمراء', nameEn: 'Al Hamrah' },
          { id: 'al-ruwais', nameAr: 'الرويس', nameEn: 'Al Ruwais' },
          { id: 'al-sharafiyah', nameAr: 'الشرفية', nameEn: 'Al Sharafiyah' },
          { id: 'al-bawadi', nameAr: 'البوادي', nameEn: 'Al Bawadi' },
        ],
      },
      {
        id: 'east-jeddah',
        nameAr: 'شرق جدة',
        nameEn: 'East Jeddah',
        districts: [
          { id: 'al-safa', nameAr: 'الصفا', nameEn: 'Al Safa' },
          { id: 'al-faisaliyah-jeddah', nameAr: 'الفيصلية', nameEn: 'Al Faisaliyah' },
          { id: 'al-wurud-jeddah', nameAr: 'الورود', nameEn: 'Al Wurud' },
          { id: 'al-rehab', nameAr: 'الرحاب', nameEn: 'Al Rehab' },
          { id: 'al-misfalah', nameAr: 'المسفلة', nameEn: 'Al Misfalah' },
        ],
      },
    ],
  },
  {
    id: 'dammam',
    nameAr: 'الدمام',
    nameEn: 'Dammam',
    regions: [
      {
        id: 'north-dammam',
        nameAr: 'شمال الدمام',
        nameEn: 'North Dammam',
        districts: [
          { id: 'al-anoud', nameAr: 'العنود', nameEn: 'Al Anoud' },
          { id: 'al-faisaliyah-dammam', nameAr: 'الفيصلية', nameEn: 'Al Faisaliyah' },
          { id: 'al-nur', nameAr: 'النور', nameEn: 'Al Nur' },
          { id: 'al-jawhara', nameAr: 'الجوهرة', nameEn: 'Al Jawhara' },
          { id: 'al-muraikabat', nameAr: 'المريكبات', nameEn: 'Al Muraikabat' },
        ],
      },
      {
        id: 'south-dammam',
        nameAr: 'جنوب الدمام',
        nameEn: 'South Dammam',
        districts: [
          { id: 'al-fursan', nameAr: 'الفرسان', nameEn: 'Al Fursan' },
          { id: 'al-khalidiyah', nameAr: 'الخالدية', nameEn: 'Al Khalidiyah' },
          { id: 'al-shatea-dammam', nameAr: 'الشاطئ', nameEn: 'Al Shatea' },
          { id: 'al-mazoun', nameAr: 'المزون', nameEn: 'Al Mazoun' },
        ],
      },
      {
        id: 'central-dammam',
        nameAr: 'وسط الدمام',
        nameEn: 'Central Dammam',
        districts: [
          { id: 'al-corniche', nameAr: 'الكورنيش', nameEn: 'Al Corniche' },
          { id: 'al-badiyah', nameAr: 'البادية', nameEn: 'Al Badiyah' },
          { id: 'al-nahdah', nameAr: 'النهضة', nameEn: 'Al Nahdah' },
          { id: 'al-hamraa-dammam', nameAr: 'الحمراء', nameEn: 'Al Hamraa' },
        ],
      },
    ],
  },
  {
    id: 'makkah',
    nameAr: 'مكة المكرمة',
    nameEn: 'Makkah',
    regions: [
      {
        id: 'central-makkah',
        nameAr: 'وسط مكة',
        nameEn: 'Central Makkah',
        districts: [
          { id: 'al-haram', nameAr: 'الحرم', nameEn: 'Al Haram' },
          { id: 'ajyad', nameAr: 'أجياد', nameEn: 'Ajyad' },
          { id: 'al-ghazza', nameAr: 'الغزة', nameEn: 'Al Ghazza' },
          { id: 'al-misfalah-makkah', nameAr: 'المسفلة', nameEn: 'Al Misfalah' },
          { id: 'al-aziziyah-makkah', nameAr: 'العزيزية', nameEn: 'Al Aziziyah' },
        ],
      },
      {
        id: 'north-makkah',
        nameAr: 'شمال مكة',
        nameEn: 'North Makkah',
        districts: [
          { id: 'al-zaher', nameAr: 'الزاهر', nameEn: 'Al Zaher' },
          { id: 'al-rawabi', nameAr: 'الروابي', nameEn: 'Al Rawabi' },
          { id: 'al-nakhil-makkah', nameAr: 'النخيل', nameEn: 'Al Nakhil' },
          { id: 'al-kakiyah', nameAr: 'الكاكية', nameEn: 'Al Kakiyah' },
        ],
      },
      {
        id: 'south-makkah',
        nameAr: 'جنوب مكة',
        nameEn: 'South Makkah',
        districts: [
          { id: 'al-mansur', nameAr: 'المنصور', nameEn: 'Al Mansur' },
          { id: 'al-awali', nameAr: 'العوالي', nameEn: 'Al Awali' },
          { id: 'al-umrah', nameAr: 'العمرة', nameEn: 'Al Umrah' },
          { id: 'al-tanaeem', nameAr: 'التنعيم', nameEn: 'Al Tanaeem' },
        ],
      },
    ],
  },
  {
    id: 'madinah',
    nameAr: 'المدينة المنورة',
    nameEn: 'Madinah',
    regions: [
      {
        id: 'central-madinah',
        nameAr: 'وسط المدينة',
        nameEn: 'Central Madinah',
        districts: [
          { id: 'al-haram-madinah', nameAr: 'الحرم النبوي', nameEn: 'Al Haram' },
          { id: 'al-anbariyah', nameAr: 'العنبرية', nameEn: 'Al Anbariyah' },
          { id: 'al-aziziyah-madinah', nameAr: 'العزيزية', nameEn: 'Al Aziziyah' },
          { id: 'quba', nameAr: 'قباء', nameEn: 'Quba' },
        ],
      },
      {
        id: 'north-madinah',
        nameAr: 'شمال المدينة',
        nameEn: 'North Madinah',
        districts: [
          { id: 'al-ranuna', nameAr: 'الرانوناء', nameEn: 'Al Ranuna' },
          { id: 'al-aqiq', nameAr: 'العقيق', nameEn: 'Al Aqiq' },
          { id: 'al-yarmuk', nameAr: 'اليرموك', nameEn: 'Al Yarmuk' },
        ],
      },
    ],
  },
  {
    id: 'taif',
    nameAr: 'الطائف',
    nameEn: 'Taif',
    regions: [
      {
        id: 'central-taif',
        nameAr: 'وسط الطائف',
        nameEn: 'Central Taif',
        districts: [
          { id: 'al-nuzlah-taif', nameAr: 'النزلة', nameEn: 'Al Nuzlah' },
          { id: 'al-faisaliyah-taif', nameAr: 'الفيصلية', nameEn: 'Al Faisaliyah' },
          { id: 'al-salamah', nameAr: 'السلامة', nameEn: 'Al Salamah' },
          { id: 'al-hada', nameAr: 'الهدا', nameEn: 'Al Hada' },
        ],
      },
      {
        id: 'north-taif',
        nameAr: 'شمال الطائف',
        nameEn: 'North Taif',
        districts: [
          { id: 'al-rudaf', nameAr: 'الردف', nameEn: 'Al Rudaf' },
          { id: 'al-shafa', nameAr: 'الشفا', nameEn: 'Al Shafa' },
          { id: 'al-hawiyah', nameAr: 'الحوية', nameEn: 'Al Hawiyah' },
        ],
      },
    ],
  },
  {
    id: 'tabuk',
    nameAr: 'تبوك',
    nameEn: 'Tabuk',
    regions: [
      {
        id: 'central-tabuk',
        nameAr: 'وسط تبوك',
        nameEn: 'Central Tabuk',
        districts: [
          { id: 'al-rawdah-tabuk', nameAr: 'الروضة', nameEn: 'Al Rawdah' },
          { id: 'al-aziziyah-tabuk', nameAr: 'العزيزية', nameEn: 'Al Aziziyah' },
          { id: 'al-nahdah-tabuk', nameAr: 'النهضة', nameEn: 'Al Nahdah' },
          { id: 'al-salam-tabuk', nameAr: 'السلام', nameEn: 'Al Salam' },
        ],
      },
    ],
  },
  {
    id: 'abha',
    nameAr: 'أبها',
    nameEn: 'Abha',
    regions: [
      {
        id: 'central-abha',
        nameAr: 'وسط أبها',
        nameEn: 'Central Abha',
        districts: [
          { id: 'al-nahdah-abha', nameAr: 'النهضة', nameEn: 'Al Nahdah' },
          { id: 'al-aziziyah-abha', nameAr: 'العزيزية', nameEn: 'Al Aziziyah' },
          { id: 'al-qabel', nameAr: 'القابل', nameEn: 'Al Qabel' },
          { id: 'al-mahalah', nameAr: 'المحالة', nameEn: 'Al Mahalah' },
        ],
      },
    ],
  },
  {
    id: 'qassim',
    nameAr: 'القصيم',
    nameEn: 'Qassim',
    regions: [
      {
        id: 'buraydah',
        nameAr: 'بريدة',
        nameEn: 'Buraydah',
        districts: [
          { id: 'al-rawdah-buraydah', nameAr: 'الروضة', nameEn: 'Al Rawdah' },
          { id: 'al-nakhil-buraydah', nameAr: 'النخيل', nameEn: 'Al Nakhil' },
          { id: 'al-falah', nameAr: 'الفلاح', nameEn: 'Al Falah' },
        ],
      },
      {
        id: 'unayzah',
        nameAr: 'عنيزة',
        nameEn: 'Unayzah',
        districts: [
          { id: 'al-muhammadiyah', nameAr: 'المحمدية', nameEn: 'Al Muhammadiyah' },
          { id: 'al-rayyan', nameAr: 'الريان', nameEn: 'Al Rayyan' },
        ],
      },
    ],
  },
  {
    id: 'hail',
    nameAr: 'حائل',
    nameEn: 'Hail',
    regions: [
      {
        id: 'central-hail',
        nameAr: 'وسط حائل',
        nameEn: 'Central Hail',
        districts: [
          { id: 'al-aziziyah-hail', nameAr: 'العزيزية', nameEn: 'Al Aziziyah' },
          { id: 'al-salam-hail', nameAr: 'السلام', nameEn: 'Al Salam' },
          { id: 'al-hamraa-hail', nameAr: 'الحمراء', nameEn: 'Al Hamraa' },
          { id: 'al-rawdah-hail', nameAr: 'الروضة', nameEn: 'Al Rawdah' },
        ],
      },
    ],
  },
];

// Helper functions
export function getCityById(id: string): City | undefined {
  return SAUDI_CITIES.find(c => c.id === id);
}

export function getCityByName(name: string): City | undefined {
  return SAUDI_CITIES.find(c =>
    c.nameAr === name || c.nameEn === name ||
    c.id === name.toLowerCase()
  );
}

export function getRegionsByCity(cityId: string): Region[] {
  return getCityById(cityId)?.regions || [];
}

export function getDistrictsByRegion(cityId: string, regionId: string): District[] {
  return getCityById(cityId)?.regions.find(r => r.id === regionId)?.districts || [];
}

export function getAllDistricts(cityId: string): District[] {
  return getCityById(cityId)?.regions.flatMap(r => r.districts) || [];
}
