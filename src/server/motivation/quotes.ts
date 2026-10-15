/**
 * Daily motivation bank — real, attributed lines from coaches, athletes,
 * pastors, scripture, and sales/business builders. Hand-curated; no scraping.
 *
 * `team` marks Miami Dolphins / Miami Hurricanes voices. The picker
 * (see ./pick.ts) surfaces those more often than their share of the bank.
 *
 * Keep each `text` short enough for a phone notification (~160 chars).
 */

export type QuoteSource = "sports" | "faith" | "sales" | "builders";
export type QuoteTeam = "dolphins" | "hurricanes";

export type Quote = {
  text: string;
  author: string;
  /** One or two words shown after the author, e.g. "Dolphins coach". */
  role?: string;
  source: QuoteSource;
  team?: QuoteTeam;
};

// ── Miami: Dolphins ─────────────────────────────────────────────
const dolphins: Quote[] = [
  { text: "The start is what stops most people.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "Success is not forever, and failure isn't fatal.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "I don't know any other way to lead but by example.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "The superior man blames himself. The inferior man blames others.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "Leadership is a matter of having people look at you and gain confidence, seeing how you react. If you're in control, they're in control.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "Overconfidence can be a disease. It can cause you to stop doing the things that got you success in the first place.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "Sure, luck means a lot in football. Not having a good quarterback is bad luck.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "The one thing I want is for my players to play for the name on the front of the jersey, not the one on the back.", author: "Don Shula", role: "Dolphins coach", source: "sports", team: "dolphins" },
  { text: "There is no substitute for hard work.", author: "Dan Marino", role: "Dolphins QB", source: "sports", team: "dolphins" },
  { text: "Make a difference today for someone who is fighting for their tomorrow.", author: "Jim Kelly", role: "Hurricanes QB", source: "sports", team: "hurricanes" },
];

// ── Miami: Hurricanes ───────────────────────────────────────────
const hurricanes: Quote[] = [
  { text: "We're on a collision course with the national championship. The only variable is time.", author: "Howard Schnellenberger", role: "Hurricanes coach", source: "sports", team: "hurricanes" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson", role: "Hurricanes & Dolphins coach", source: "sports", team: "hurricanes" },
  { text: "Do you want to be safe and good, or do you want to take a chance and be great?", author: "Jimmy Johnson", role: "Hurricanes & Dolphins coach", source: "sports", team: "hurricanes" },
  { text: "Treat a person as he is, and he will remain as he is. Treat him as he could be, and he will become what he should be.", author: "Jimmy Johnson", role: "Hurricanes & Dolphins coach", source: "sports", team: "hurricanes" },
  { text: "Wins and losses come a dime a dozen. But effort? Nobody can judge effort. Effort is between you and you.", author: "Ray Lewis", role: "Hurricanes LB", source: "sports", team: "hurricanes" },
  { text: "Greatness is a lot of small things done well. Day after day, workout after workout, obedience after obedience.", author: "Ray Lewis", role: "Hurricanes LB", source: "sports", team: "hurricanes" },
  { text: "The hardest thing to do is to work hard when no one is watching.", author: "Ray Lewis", role: "Hurricanes LB", source: "sports", team: "hurricanes" },
  { text: "If tomorrow wasn't promised, what would you give for today?", author: "Ray Lewis", role: "Hurricanes LB", source: "sports", team: "hurricanes" },
  { text: "Look up, get up, and don't ever give up.", author: "Michael Irvin", role: "Hurricanes WR", source: "sports", team: "hurricanes" },
  { text: "It's all about the U.", author: "The U", role: "Coral Gables", source: "sports", team: "hurricanes" },
];

// ── Sports ──────────────────────────────────────────────────────
const sports: Quote[] = [
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi", role: "Packers coach", source: "sports" },
  { text: "Winning is not a sometime thing; it's an all the time thing.", author: "Vince Lombardi", role: "Packers coach", source: "sports" },
  { text: "Perfection is not attainable, but if we chase perfection we can catch excellence.", author: "Vince Lombardi", role: "Packers coach", source: "sports" },
  { text: "Practice does not make perfect. Only perfect practice makes perfect.", author: "Vince Lombardi", role: "Packers coach", source: "sports" },
  { text: "Make each day your masterpiece.", author: "John Wooden", role: "UCLA coach", source: "sports" },
  { text: "Things turn out best for the people who make the best of the way things turn out.", author: "John Wooden", role: "UCLA coach", source: "sports" },
  { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden", role: "UCLA coach", source: "sports" },
  { text: "Failure is not fatal, but failure to change might be.", author: "John Wooden", role: "UCLA coach", source: "sports" },
  { text: "It's the little details that are vital. Little things make big things happen.", author: "John Wooden", role: "UCLA coach", source: "sports" },
  { text: "I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan", source: "sports" },
  { text: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan", source: "sports" },
  { text: "I can accept failure, everyone fails at something. But I can't accept not trying.", author: "Michael Jordan", source: "sports" },
  { text: "Everything negative — pressure, challenges — is all an opportunity for me to rise.", author: "Kobe Bryant", source: "sports" },
  { text: "Job's not finished.", author: "Kobe Bryant", role: "2009 Finals", source: "sports" },
  { text: "A champion is defined not by their wins but by how they can recover when they fall.", author: "Serena Williams", source: "sports" },
  { text: "Don't count the days; make the days count.", author: "Muhammad Ali", source: "sports" },
  { text: "I hated every minute of training, but I said, don't quit. Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali", source: "sports" },
  { text: "He who is not courageous enough to take risks will accomplish nothing in life.", author: "Muhammad Ali", source: "sports" },
  { text: "Every strike brings me closer to the next home run.", author: "Babe Ruth", source: "sports" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth", source: "sports" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", source: "sports" },
  { text: "There may be people who have more talent than you, but there's no excuse for anyone to work harder than you do.", author: "Derek Jeter", source: "sports" },
  { text: "It's not the will to win that matters — everyone has that. It's the will to prepare to win that matters.", author: "Bear Bryant", role: "Alabama coach", source: "sports" },
  { text: "Show class, have pride, and display character. If you do, winning takes care of itself.", author: "Bear Bryant", role: "Alabama coach", source: "sports" },
  { text: "The process is what you have to do day in and day out to be successful.", author: "Nick Saban", role: "Alabama coach", source: "sports" },
  { text: "Everyone has a plan until they get punched in the mouth.", author: "Mike Tyson", source: "sports" },
  { text: "Do your job.", author: "Bill Belichick", role: "Patriots coach", source: "sports" },
  { text: "You want to know which ring is my favorite? The next one.", author: "Tom Brady", source: "sports" },
  { text: "Excellence is the gradual result of always striving to do better.", author: "Pat Riley", role: "Heat president", source: "sports" },
  { text: "There's no such thing as coulda, shoulda, or woulda. If you shoulda and coulda, you woulda done it.", author: "Pat Riley", role: "Heat president", source: "sports" },
  { text: "A champion needs a motivation above and beyond winning.", author: "Pat Riley", role: "Heat president", source: "sports" },
  { text: "A champion is someone who gets up when he can't.", author: "Jack Dempsey", source: "sports" },
  { text: "Don't give up. Don't ever give up.", author: "Jim Valvano", role: "NC State coach", source: "sports" },
  { text: "Ability is what you're capable of doing. Motivation determines what you do. Attitude determines how well you do it.", author: "Lou Holtz", role: "Notre Dame coach", source: "sports" },
  { text: "It's not the load that breaks you down, it's the way you carry it.", author: "Lou Holtz", role: "Notre Dame coach", source: "sports" },
  { text: "The most rewarding things you do in life are often the ones that look like they cannot be done.", author: "Arnold Palmer", source: "sports" },
  { text: "Pressure is a privilege.", author: "Billie Jean King", source: "sports" },
  { text: "A life is not important except in the impact it has on other lives.", author: "Jackie Robinson", source: "sports" },
  { text: "Celebrate what you've accomplished, but raise the bar a little higher each time you succeed.", author: "Mia Hamm", source: "sports" },
  { text: "Great moments are born from great opportunity.", author: "Herb Brooks", role: "1980 USA hockey coach", source: "sports" },
  { text: "Gold medals aren't really made of gold. They're made of sweat, determination, and a hard-to-find alloy called guts.", author: "Dan Gable", role: "Iowa wrestling coach", source: "sports" },
  { text: "The most important measure of how good a game I played was how much better I'd made my teammates play.", author: "Bill Russell", source: "sports" },
  { text: "The strength of the team is each individual member. The strength of each member is the team.", author: "Phil Jackson", role: "Bulls & Lakers coach", source: "sports" },
  { text: "To give anything less than your best is to sacrifice the gift.", author: "Steve Prefontaine", source: "sports" },
  { text: "Never die easy.", author: "Walter Payton", source: "sports" },
  { text: "Today I will do what others won't, so tomorrow I can accomplish what others can't.", author: "Jerry Rice", source: "sports" },
  { text: "All men are created equal. Some work harder in preseason.", author: "Emmitt Smith", source: "sports" },
  { text: "Don't look back. Something might be gaining on you.", author: "Satchel Paige", source: "sports" },
  { text: "It ain't over till it's over.", author: "Yogi Berra", source: "sports" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", role: "high school coach", source: "sports" },
  { text: "The only place success comes before work is in the dictionary.", author: "Vince Lombardi", role: "Packers coach", source: "sports" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King", source: "sports" },
  { text: "If you're not making mistakes, then you're not doing anything.", author: "John Wooden", role: "UCLA coach", source: "sports" },
  { text: "The more difficult the victory, the greater the happiness in winning.", author: "Pelé", source: "sports" },
];

// ── Faith: pastors and scripture ────────────────────────────────
const faith: Quote[] = [
  { text: "By perseverance the snail reached the ark.", author: "Charles Spurgeon", role: "pastor", source: "faith" },
  { text: "Faith is acting like it is so, even when it's not so, in order that it might be so, simply because God said so.", author: "Tony Evans", role: "pastor", source: "faith" },
  { text: "If you can't figure out your purpose, figure out your passion. Your passion will lead you right into your purpose.", author: "T.D. Jakes", role: "pastor", source: "faith" },
  { text: "Never make a permanent decision based on a temporary storm.", author: "T.D. Jakes", role: "pastor", source: "faith" },
  { text: "We are products of our past, but we don't have to be prisoners of it.", author: "Rick Warren", role: "pastor", source: "faith" },
  { text: "Courage is contagious. When a brave man takes a stand, the spines of others are often stiffened.", author: "Billy Graham", role: "evangelist", source: "faith" },
  { text: "You may make mistakes, but you are not a mistake.", author: "Joel Osteen", role: "pastor", source: "faith" },
  { text: "Choosing to be positive and having a grateful attitude is going to determine how you're going to live your life.", author: "Joel Osteen", role: "pastor", source: "faith" },
  { text: "We struggle with insecurity because we compare our behind-the-scenes with everyone else's highlight reel.", author: "Steven Furtick", role: "pastor", source: "faith" },
  { text: "Successful people do consistently what normal people do occasionally.", author: "Craig Groeschel", role: "pastor", source: "faith" },
  { text: "Your direction, not your intention, determines your destination.", author: "Andy Stanley", role: "pastor", source: "faith" },
  { text: "Uncertainty is not an indication of poor leadership; it underscores the need for leadership.", author: "Andy Stanley", role: "pastor", source: "faith" },
  { text: "A leader is one who knows the way, goes the way, and shows the way.", author: "John C. Maxwell", role: "pastor & author", source: "faith" },
  { text: "You'll never change your life until you change something you do daily. The secret of your success is found in your daily routine.", author: "John C. Maxwell", role: "pastor & author", source: "faith" },
  { text: "God never said that the journey would be easy, but He did say that the arrival would be worthwhile.", author: "Max Lucado", role: "pastor", source: "faith" },
  { text: "Obey God and leave all the consequences to Him.", author: "Charles Stanley", role: "pastor", source: "faith" },
  { text: "Disappointments are inevitable; discouragement is a choice.", author: "Charles Stanley", role: "pastor", source: "faith" },
  { text: "Character is what you are in the dark.", author: "D.L. Moody", role: "evangelist", source: "faith" },
  { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Chuck Swindoll", role: "pastor", source: "faith" },
  { text: "Do the next thing.", author: "Elisabeth Elliot", role: "missionary", source: "faith" },
  { text: "Wherever you are, be all there.", author: "Jim Elliot", role: "missionary", source: "faith" },
  { text: "Not all of us can do great things. But we can do small things with great love.", author: "Mother Teresa", source: "faith" },
  { text: "If you can't fly then run, if you can't run then walk, if you can't walk then crawl, but whatever you do you have to keep moving forward.", author: "Martin Luther King Jr.", role: "pastor", source: "faith" },
  { text: "Faith is taking the first step even when you don't see the whole staircase.", author: "Martin Luther King Jr.", role: "pastor", source: "faith" },
  { text: "Commit to the Lord whatever you do, and he will establish your plans.", author: "Proverbs 16:3", source: "faith" },
  { text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", author: "Colossians 3:23", source: "faith" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", author: "Galatians 6:9", source: "faith" },
  { text: "I can do all this through him who gives me strength.", author: "Philippians 4:13", source: "faith" },
  { text: "Do you see someone skilled in their work? They will serve before kings.", author: "Proverbs 22:29", source: "faith" },
  { text: "A sluggard's appetite is never filled, but the desires of the diligent are fully satisfied.", author: "Proverbs 13:4", source: "faith" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", author: "Joshua 1:9", source: "faith" },
  { text: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary.", author: "Isaiah 40:31", source: "faith" },
  { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", author: "Proverbs 21:5", source: "faith" },
  { text: "Whatever your hand finds to do, do it with all your might.", author: "Ecclesiastes 9:10", source: "faith" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", author: "Proverbs 3:5", source: "faith" },
  { text: "Whoever can be trusted with very little can also be trusted with much.", author: "Luke 16:10", source: "faith" },
  { text: "Let us run with perseverance the race marked out for us.", author: "Hebrews 12:1", source: "faith" },
  { text: "The Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", author: "2 Timothy 1:7", source: "faith" },
  { text: "Never be lacking in zeal, but keep your spiritual fervor, serving the Lord.", author: "Romans 12:11", source: "faith" },
  { text: "A generous person will prosper; whoever refreshes others will be refreshed.", author: "Proverbs 11:25", source: "faith" },
  { text: "May the favor of the Lord our God rest on us; establish the work of our hands.", author: "Psalm 90:17", source: "faith" },
  { text: "The secret to success is good leadership, and good leadership is all about making the lives of your team members better.", author: "Tony Dungy", role: "Colts coach", source: "faith" },
];

// ── Sales ───────────────────────────────────────────────────────
const sales: Quote[] = [
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", source: "sales" },
  { text: "Timid salesmen have skinny kids.", author: "Zig Ziglar", source: "sales" },
  { text: "You can have everything in life you want, if you will just help enough other people get what they want.", author: "Zig Ziglar", source: "sales" },
  { text: "People don't buy for logical reasons. They buy for emotional reasons.", author: "Zig Ziglar", source: "sales" },
  { text: "Expect the best. Prepare for the worst. Capitalize on what comes.", author: "Zig Ziglar", source: "sales" },
  { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar", source: "sales" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "Zig Ziglar", source: "sales" },
  { text: "Stop selling. Start helping.", author: "Zig Ziglar", source: "sales" },
  { text: "Don't wish it were easier; wish you were better.", author: "Jim Rohn", source: "sales" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn", source: "sales" },
  { text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn", source: "sales" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", source: "sales" },
  { text: "Pretend that every single person you meet has a sign around their neck that says, 'Make me feel important.'", author: "Mary Kay Ash", source: "sales" },
  { text: "Don't limit yourself. Many people limit themselves to what they think they can do.", author: "Mary Kay Ash", source: "sales" },
  { text: "Success is your duty, obligation, and responsibility.", author: "Grant Cardone", source: "sales" },
  { text: "Approach every situation with a whatever-it-takes mindset.", author: "Grant Cardone", source: "sales" },
  { text: "Approach each customer with the idea of helping them solve a problem or achieve a goal, not of selling a product.", author: "Brian Tracy", source: "sales" },
  { text: "Successful people are simply those with successful habits.", author: "Brian Tracy", source: "sales" },
  { text: "Begin always expecting good things to happen.", author: "Tom Hopkins", source: "sales" },
  { text: "I will persist until I succeed. Always will I take another step. If that is of no avail I will take another, and yet another.", author: "Og Mandino", source: "sales" },
  { text: "Failure will never overtake me if my determination to succeed is strong enough.", author: "Og Mandino", source: "sales" },
  { text: "Whatever the mind can conceive and believe, it can achieve.", author: "Napoleon Hill", source: "sales" },
  { text: "Patience, persistence and perspiration make an unbeatable combination for success.", author: "Napoleon Hill", source: "sales" },
  { text: "Inaction breeds doubt and fear. Action breeds confidence and courage.", author: "Dale Carnegie", source: "sales" },
  { text: "Most of the important things in the world have been accomplished by people who kept on trying when there seemed to be no hope at all.", author: "Dale Carnegie", source: "sales" },
  { text: "People don't like to be sold, but they love to buy.", author: "Jeffrey Gitomer", source: "sales" },
  { text: "All things being equal, people do business with, and refer business to, people they know, like, and trust.", author: "Bob Burg", source: "sales" },
  { text: "I never dreamed about success. I worked for it.", author: "Estée Lauder", source: "sales" },
  { text: "Dig your well before you're thirsty.", author: "Harvey Mackay", source: "sales" },
  { text: "People do not buy goods and services. They buy relations, stories, and magic.", author: "Seth Godin", source: "sales" },
  { text: "We become what we think about.", author: "Earl Nightingale", source: "sales" },
  { text: "Never give up on a dream just because of the time it will take to accomplish it. The time will pass anyway.", author: "Earl Nightingale", source: "sales" },
  { text: "There is only one boss: the customer. And he can fire everybody in the company simply by spending his money somewhere else.", author: "Sam Walton", source: "sales" },
  { text: "High expectations are the key to everything.", author: "Sam Walton", source: "sales" },
  { text: "We see our customers as invited guests to a party, and we are the hosts.", author: "Jeff Bezos", source: "sales" },
  { text: "People will forget what you said and what you did, but they will never forget how you made them feel.", author: "Maya Angelou", source: "sales" },
  { text: "Every sale has five basic obstacles: no need, no money, no hurry, no desire, no trust.", author: "Zig Ziglar", source: "sales" },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips", source: "sales" },
  { text: "Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.", author: "Thomas Edison", source: "sales" },
  { text: "Opportunity is missed by most people because it is dressed in overalls and looks like work.", author: "Thomas Edison", source: "sales" },
];

// ── Builders and thinkers ───────────────────────────────────────
const builders: Quote[] = [
  { text: "Whether you think you can, or you think you can't — you're right.", author: "Henry Ford", source: "builders" },
  { text: "Obstacles are those frightful things you see when you take your eyes off your goal.", author: "Henry Ford", source: "builders" },
  { text: "Nothing in this world can take the place of persistence.", author: "Calvin Coolidge", source: "builders" },
  { text: "Never give in, never give in, never, never, never.", author: "Winston Churchill", source: "builders" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", source: "builders" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", source: "builders" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", source: "builders" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "builders" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca", source: "builders" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus", source: "builders" },
  { text: "The most difficult thing is the decision to act; the rest is merely tenacity.", author: "Amelia Earhart", source: "builders" },
  { text: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", author: "Colin Powell", source: "builders" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", source: "builders" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Chinese proverb", source: "builders" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", source: "builders" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin", source: "builders" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin", source: "builders" },
  { text: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett", source: "builders" },
  { text: "If you are going through hell, keep going.", author: "Winston Churchill", source: "builders" },
  { text: "Quality means doing it right when no one is looking.", author: "Henry Ford", source: "builders" },
];

export const MIAMI_QUOTES: Quote[] = [...dolphins, ...hurricanes];
export const GENERAL_QUOTES: Quote[] = [...sports, ...faith, ...sales, ...builders];
export const ALL_QUOTES: Quote[] = [...MIAMI_QUOTES, ...GENERAL_QUOTES];
