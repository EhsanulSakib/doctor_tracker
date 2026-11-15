// Shared by the seed (to generate people) and the photo script (to match a portrait to a doctor's name).

/** Bangladeshi names, romanized as they appear on English-language records. */
export const NAMES = {
  muslim: {
    male: ['Tanvir', 'Arif', 'Fahim', 'Imran', 'Sabbir', 'Mahmudul', 'Rafiqul', 'Shakil', 'Nazmul', 'Jahid', 'Rakibul', 'Sajid', 'Tareq', 'Ashraful', 'Habibur', 'Mizanur', 'Kamrul', 'Mehedi', 'Rasel', 'Zahid', 'Farhan', 'Tahmid', 'Nafis', 'Ishtiaque', 'Mostafizur', 'Saiful', 'Anisul', 'Rezaul'],
    female: ['Nusrat', 'Farzana', 'Sadia', 'Tasnim', 'Sumaiya', 'Afsana', 'Nasrin', 'Shirin', 'Roksana', 'Fatema', 'Ayesha', 'Mahmuda', 'Sharmin', 'Jannatul', 'Tahmina', 'Rumana', 'Shabnam', 'Lamia', 'Nabila', 'Anika', 'Maliha', 'Sanjida', 'Rehana', 'Dilruba', 'Mithila', 'Shamima'],
    surname: ['Ahmed', 'Hossain', 'Rahman', 'Islam', 'Chowdhury', 'Khan', 'Uddin', 'Sarkar', 'Talukder', 'Siddique', 'Haque', 'Kabir', 'Alam', 'Karim', 'Bhuiyan', 'Mollah', 'Sheikh', 'Majumder', 'Miah', 'Hasan'],
    femaleSurname: ['Akter', 'Begum', 'Khatun', 'Sultana'],
  },
  hindu: {
    male: ['Sourav', 'Pritom', 'Arnab', 'Dipankar', 'Subrata', 'Anik', 'Joydeep', 'Partha', 'Shuvo', 'Tapas'],
    female: ['Puja', 'Moumita', 'Ananya', 'Rupa', 'Priyanka', 'Sharmistha', 'Tanushree', 'Mousumi', 'Dipa', 'Shreya'],
    surname: ['Das', 'Roy', 'Saha', 'Paul', 'Chakraborty', 'Ghosh', 'Dey', 'Sen', 'Biswas', 'Mondal'],
    femaleSurname: [] as string[],
  },
};

/** First names the seed uses for women, for matching portraits. */
export const FEMALE_FIRST_NAMES = new Set([...NAMES.muslim.female, ...NAMES.hindu.female]);
