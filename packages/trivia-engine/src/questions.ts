import type { Question, TriviaCategory } from './types';

type Raw = Omit<Question, 'options' | 'answer'> & { right: string; wrong: [string, string, string] };
const q = (category: TriviaCategory, text: string, right: string, ...wrong: [string, string, string]): Raw => ({ id: '', category, text, right, wrong });

/** Original wording. Each question has one clearly correct answer. */
const RAW: readonly Raw[] = [
  q('science', 'What is the chemical symbol for gold?', 'Au', 'Ag', 'Gd', 'Go'),
  q('science', 'Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Mercury', 'Jupiter'),
  q('science', 'How many bones does an adult human body have?', '206', '186', '212', '256'),
  q('science', 'Which gas do plants take in from the air for photosynthesis?', 'Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'),
  q('science', 'Which of these is the hardest natural substance?', 'Diamond', 'Quartz', 'Topaz', 'Corundum'),
  q('science', 'Roughly how fast does light travel in a vacuum?', '300,000 km per second', '30,000 km per second', '3,000,000 km per second', '150,000 km per second'),
  q('science', 'What is the largest organ of the human body?', 'Skin', 'Liver', 'Lungs', 'Brain'),
  q('science', 'Which part of a cell is often called its powerhouse?', 'Mitochondria', 'Nucleus', 'Ribosome', 'Golgi apparatus'),
  q('science', 'At sea level, at what temperature in Celsius does water boil?', '100', '90', '110', '212'),
  q('science', 'Which blood cells carry oxygen around the body?', 'Red blood cells', 'White blood cells', 'Platelets', 'Plasma cells'),
  q('science', 'Which star is closest to Earth?', 'The Sun', 'Proxima Centauri', 'Sirius', 'Polaris'),
  q('science', 'What is the atomic number of hydrogen?', '1', '2', '3', '8'),
  q('science', 'Which force pulls objects towards the centre of the Earth?', 'Gravity', 'Magnetism', 'Friction', 'Inertia'),
  q('science', 'Which planet has the most famous system of rings?', 'Saturn', 'Mars', 'Mercury', 'Venus'),
  q('science', 'What is the chemical formula for water?', 'H2O', 'CO2', 'O2', 'NaCl'),

  q('geography', 'What is the capital of Australia?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'),
  q('geography', 'Which ocean is the largest?', 'Pacific', 'Atlantic', 'Indian', 'Arctic'),
  q('geography', 'In which country is the city of Marrakesh?', 'Morocco', 'Tunisia', 'Egypt', 'Algeria'),
  q('geography', 'What is the capital of Canada?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal'),
  q('geography', 'Mount Everest sits on the border of Nepal and which country?', 'China', 'India', 'Bhutan', 'Pakistan'),
  q('geography', 'Which is the largest hot desert in the world?', 'Sahara', 'Gobi', 'Kalahari', 'Arabian'),
  q('geography', 'What is the capital of Brazil?', 'Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'),
  q('geography', 'How many continents are there?', '7', '5', '6', '8'),
  q('geography', 'Which country is shaped a bit like a boot?', 'Italy', 'Greece', 'Portugal', 'Chile'),
  q('geography', 'What is the capital of Egypt?', 'Cairo', 'Alexandria', 'Giza', 'Luxor'),
  q('geography', 'Which is the smallest country in the world by area?', 'Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'),
  q('geography', 'Which strait separates Spain from Morocco?', 'Strait of Gibraltar', 'Bosphorus', 'Strait of Hormuz', 'Strait of Malacca'),
  q('geography', 'Which river flows through Paris?', 'Seine', 'Thames', 'Rhine', 'Danube'),
  q('geography', 'What is the capital of the Philippines?', 'Manila', 'Cebu City', 'Davao', 'Quezon City'),
  q('geography', 'Which is the largest island in the world that is not a continent?', 'Greenland', 'Madagascar', 'Borneo', 'New Guinea'),

  q('history', 'In which year did the Second World War end?', '1945', '1939', '1943', '1950'),
  q('history', 'Who was the first president of the United States?', 'George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'),
  q('history', 'Which civilisation built Machu Picchu?', 'Inca', 'Aztec', 'Maya', 'Olmec'),
  q('history', 'In which year did the Berlin Wall fall?', '1989', '1961', '1975', '1991'),
  q('history', 'Who was the first person to walk on the Moon?', 'Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'Michael Collins'),
  q('history', 'Which ancient people built the pyramids of Giza?', 'Ancient Egyptians', 'Romans', 'Greeks', 'Persians'),
  q('history', 'Whose expedition was the first to sail around the world, from 1519 to 1522?', 'Magellan', 'Columbus', 'Vasco da Gama', 'James Cook'),
  q('history', 'Who is famous for posting the 95 Theses in 1517?', 'Martin Luther', 'John Calvin', 'Henry VIII', 'Erasmus'),
  q('history', 'In which year did the Titanic sink?', '1912', '1905', '1915', '1921'),
  q('history', 'Which structure was built across northern China to guard against invasions?', 'The Great Wall', "Hadrian's Wall", 'The Berlin Wall', 'The Western Wall'),
  q('history', 'In which year did the French Revolution begin?', '1789', '1776', '1804', '1815'),
  q('history', 'Who was the last active ruler of Ptolemaic Egypt?', 'Cleopatra VII', 'Nefertiti', 'Hatshepsut', 'Tutankhamun'),
  q('history', 'In which year did the Philippines declare independence from Spain?', '1898', '1521', '1946', '1935'),
  q('history', 'Who introduced movable-type printing to Europe in the 1400s?', 'Johannes Gutenberg', 'Leonardo da Vinci', 'Isaac Newton', 'Galileo'),
  q('history', 'Which war was fought between the Union and the Confederacy from 1861 to 1865?', 'American Civil War', 'War of 1812', 'Korean War', 'Revolutionary War'),

  q('culture', 'Who painted the Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'),
  q('culture', 'How many strings does a standard guitar have?', '6', '4', '5', '7'),
  q('culture', 'Who wrote the play Romeo and Juliet?', 'William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Oscar Wilde'),
  q('culture', 'In chess, which piece moves only diagonally?', 'Bishop', 'Rook', 'Knight', 'Pawn'),
  q('culture', 'Which sport is played at Wimbledon?', 'Tennis', 'Golf', 'Cricket', 'Badminton'),
  q('culture', 'In which country did sushi originate?', 'Japan', 'China', 'Korea', 'Thailand'),
  q('culture', 'How many players per side are on court in a basketball game?', '5', '6', '7', '11'),
  q('culture', 'Which instrument has 88 keys?', 'Piano', 'Accordion', 'Organ', 'Harp'),
  q('culture', 'Which toy company, famous for plastic bricks, comes from Denmark?', 'LEGO', 'Hasbro', 'Mattel', 'Playmobil'),
  q('culture', 'Which three colours are the primary colours of light?', 'Red, green, blue', 'Red, yellow, blue', 'Cyan, magenta, yellow', 'Red, orange, green'),
  q('culture', 'In which sport can you score a birdie?', 'Golf', 'Baseball', 'Archery', 'Table tennis'),
  q('culture', 'Who wrote the Harry Potter books?', 'J. K. Rowling', 'Roald Dahl', 'C. S. Lewis', 'Suzanne Collins'),
  q('culture', 'How many rings are on the Olympic flag?', '5', '4', '6', '7'),
  q('culture', 'In which city is the famous running of the bulls held each July?', 'Pamplona', 'Madrid', 'Seville', 'Barcelona'),
  q('culture', 'Which language has the most native speakers?', 'Mandarin Chinese', 'English', 'Spanish', 'Hindi'),
];

export const BANK: readonly Raw[] = RAW.map((r, i) => ({ ...r, id: `q${i}` }));

export const CATEGORY_LABELS: Record<TriviaCategory, string> = { science: 'Science', geography: 'Geography', history: 'History', culture: 'Culture' };
export const MAX_QUESTIONS = 20;
