# Issue: Implement End-to-End Playwright Test for Bible Bee Ministry Flow

## Objective

Create a comprehensive Playwright automation test script that validates the complete Bible Bee ministry flow from setup to student enrollment and progress tracking.

## Background

The Bible Bee ministry is a key feature in gatherKids that allows ministry leaders to set up divisions with different requirements (scriptures, essays), manage enrollments, and track student progress. We need to verify that this entire process works correctly from end to end.

## Requirements

Implement a detailed Playwright script that tests the following workflow:

1. **Admin Login and Ministry Setup**:

   - Log in as an admin user
   - Navigate to Ministry Management
   - Create a new "Bible Bee" ministry or access an existing one
   - Configure ministry settings (make active, set description, etc.)

2. **Bible Bee Configuration**:

   - Set up a new Bible Bee cycle for the current year
   - Create two divisions:
     - Division 1: "Junior Division" (with scripture memorization requirement of 5 verses)
     - Division 2: "Senior Division" (with essay requirement)
   - Configure age ranges for each division to ensure children can be placed correctly

3. **Scripture Data Setup**:

   - Upload a sample CSV file containing 5+ scriptures
   - Upload a sample JSON file containing 5+ additional scriptures
   - Verify that scriptures are correctly imported into the database
   - Assign scriptures to the appropriate division

4. **Family Registration**:

   - Navigate to the public registration page
   - Register a new household with two parents
   - Add two children with birthdates that qualify for each division
   - Complete registration process
   - Verify confirmation message/email

5. **Auto-Enrollment Preview**:

   - Log back in as the admin
   - Navigate to Bible Bee management
   - Access the auto-enrollment preview section
   - Verify that both newly registered children appear in the preview
   - Confirm that children are matched to the correct divisions based on age

6. **Student Enrollment**:

   - Complete the enrollment process for both children
   - Verify successful enrollment messages

7. **Progress Tracking**:
   - Navigate to the "Students" tab
   - Verify both children have Bible Bee progress cards
   - Click on the child in the scripture division
   - Verify their scripture list shows all assigned scriptures with correct status
   - Navigate back and click on the child in the essay division
   - Verify their essay submission card is displayed correctly

## Technical Requirements

1. **Test Data Preparation**:

   - Create fixture files:
     - `bible-bee-scriptures.csv` with at least 5 scripture entries
     - `bible-bee-scriptures.json` with at least 5 different scripture entries
     - Format must match the application's expected import format

2. **Test Structure**:

   - Use Playwright's page object model for maintainable test code
   - Implement proper assertions at each step
   - Add screenshots at key verification points
   - Include error handling for potential failure scenarios

3. **Environment Considerations**:
   - Test should run against both the development and UAT environments
   - Use environment variables to configure the target environment
   - Ensure proper test isolation and data cleanup

## Acceptance Criteria

- [ ] Script successfully completes the entire flow without manual intervention
- [ ] All verification steps pass consistently
- [ ] Test is robust against UI changes (uses reliable selectors)
- [ ] Test data is created and cleaned up properly
- [ ] Documentation is provided for maintaining and extending the test

## Sample Test Data

### Scripture CSV Format

```csv
scripture_order,scripture_number,counts_for,reference,category
1,1-2,2,Exodus 20:2-3,Primary Minimum
2,3,1,Leviticus 20:26,Primary Minimum
3,4,1,James 2:17,Primary Minimum
4,5,1,2 Chronicles 7:14,Primary Minimum
5,6-7,2,Psalms 19:13-14,Primary Minimum
6,8,1,Proverbs 1:7,Primary Minimum
7,9,1,Mark 10:45,Primary Minimum
8,10,1,Luke 19:10,Primary Minimum
9,11,1,John 10:10,Primary Minimum
10,12,1,Romans 1:16,Primary Minimum
11,13,1,Isaiah 12:2,Junior Minimum
12,14-15,2,Lamentations 3:22-23,Junior Minimum
13,16-25,10,Matthew 5:3-12,Junior Minimum
14,26,1,Obadiah 1:15,Competition Scriptures
15,27,1,Acts 1:8,Competition Scriptures
16,28,1,2 Timothy 1:7,Competition Scriptures
17,29-30,2,Proverbs 3:5-6,Competition Scriptures
18,31-32,2,1 Corinthians 16:13-14,Competition Scriptures
19,33,1,Zephaniah 2:3,Competition Scriptures
20,34,1,Psalm 51:10,Competition Scriptures
21,35,1,2 Corinthians 2:14,Competition Scriptures
22,36-39,4,1 Thessalonians 5:19-22,Competition Scriptures
23,40,1,1 Corinthians 13:13,Competition Scriptures
24,41-42,2,Hebrews 12:1-2,Competition Scriptures
25,43,1,Matthew 5:16,Competition Scriptures
26,44,1,Zephaniah 3:17,Competition Scriptures
27,45-46,2,Proverbs 16:3-4,Competition Scriptures
28,47,1,Matthew 19:26,Competition Scriptures
29,48-49,2,Proverbs 16:18-19,Competition Scriptures
30,50,1,Ephesians 2:10,Competition Scriptures
31,51-52,2,Galatians 5:22-23,Competition Scriptures
```

### Scripture JSON Format

```json
{
	"competition_year": "2025-2026",
	"translations": ["NIV", "KJV", "NVI"],
	"scriptures": [
		{
			"order": 1,
			"reference": "Exodus 20:2-3",
			"texts": {
				"NIV": "<sup>2</sup>I am the LORD your God, who brought you out of Egypt, out of the land of slavery. <sup>3</sup>You shall have no other gods before me.",
				"KJV": "<sup>2</sup>I am the LORD thy God, which have brought thee out of the land of Egypt, out of the house of bondage. <sup>3</sup>Thou shalt have no other gods before me.",
				"NVI": "<sup>2</sup>Yo soy el SEÑOR tu Dios. Yo te saqué de Egipto, del país donde eras esclavo. <sup>3</sup>No tengas otros dioses además de mí."
			}
		},
		{
			"order": 2,
			"reference": "Leviticus 20:26",
			"texts": {
				"NIV": "<sup>26</sup>You are to be holy to me because I, the LORD, am holy, and I have set you apart from the nations to be my own.",
				"KJV": "<sup>26</sup>And ye shall be holy unto me: for I the LORD am holy, and have severed you from other people, that ye should be mine.",
				"NVI": "<sup>26</sup>Sean ustedes santos porque yo, el Señor, soy santo y los he distinguido entre las demás naciones, para que sean míos."
			}
		},
		{
			"order": 3,
			"reference": "James 2:17",
			"texts": {
				"NIV": "<sup>17</sup>In the same way, faith by itself, if it is not accompanied by action, is dead.",
				"KJV": "<sup>17</sup>Even so faith, if it hath not works, is dead, being alone.",
				"NVI": "<sup>17</sup>Así también la fe por sí sola, si no tiene obras, está muerta."
			}
		},
		{
			"order": 4,
			"reference": "2 Chronicles 7:14",
			"texts": {
				"NIV": "<sup>14</sup>if my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven, and I will forgive their sin and will heal their land.",
				"KJV": "<sup>14</sup>If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land.",
				"NVI": "<sup>14</sup>si mi pueblo, que lleva mi nombre, se humilla y ora, y me busca y abandona su mala conducta, yo lo escucharé desde el cielo, perdonaré su pecado y restauraré su tierra."
			}
		},
		{
			"order": 4,
			"reference": "2 Chronicles 2:14",
			"texts": {
				"NIV": "<sup>14</sup>whose mother was from Dan and whose father was from Tyre. He is trained to work in gold and silver, bronze and iron, stone and wood, and with purple and blue and crimson yarn and fine linen. He is experienced in all kinds of engraving and can execute any design given to him. He will work with your skilled workers and with those of my lord, David your father.",
				"KJV": "<sup>14</sup>The son of a woman of the daughters of Dan, and his father was a man of Tyre, skilful to work in gold, and in silver, in brass, in iron, in stone, and in timber, in purple, in blue, and in fine linen, and in crimson; also to grave any manner of graving, and to find out every device which shall be put to him, with thy cunning men, and with the cunning men of my lord David thy father.",
				"NVI": "<sup>14</sup>hijo de una mujer de las hijas de Dan y cuyo padre es de Tiro, el cual sabe trabajar en oro, en plata, en bronce, en hierro, en piedra, en madera y en material de púrpura, violeta, lino y carmesí, y sabe hacer toda clase de grabados y cualquier diseño que se le asigne, para trabajar con tus expertos y con los expertos de mi señor David, tu padre."
			}
		},
		{
			"order": 5,
			"reference": "Psalms 19:13-14",
			"texts": {
				"NIV": "<sup>13</sup>Keep your servant also from willful sins; may they not rule over me. Then I will be blameless, innocent of great transgression. <sup>14</sup>May these words of my mouth and this meditation of my heart be pleasing in your sight, LORD, my Rock and my Redeemer.",
				"KJV": "<sup>13</sup>Keep back thy servant also from presumptuous sins; let them not have dominion over me: then shall I be upright, and I shall be innocent from the great transgression. <sup>14</sup>Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer.",
				"NVI": "<sup>13</sup>Libra, además, a tu siervo de pecar a sabiendas; no permitas que tales pecados me dominen. Así estaré libre de culpa y de multiplicar mis pecados. <sup>14</sup>Sean, pues, aceptables ante ti mis palabras y mis pensamientos, oh SEÑOR, roca mía y redentor mío."
			}
		},
		{
			"order": 6,
			"reference": "Psalm 51:10",
			"texts": {
				"NIV": "<sup>10</sup>Create in me a pure heart, O God, and renew a steadfast spirit within me.",
				"KJV": "<sup>10</sup>Create in me a clean heart, O God; and renew a right spirit within me.",
				"NVI": "<sup>10</sup>Crea en mí, oh Dios, un corazón limpio, y renueva la firmeza de mi espíritu."
			}
		},
		{
			"order": 7,
			"reference": "Proverbs 1:7",
			"texts": {
				"NIV": "<sup>7</sup>The fear of the LORD is the beginning of knowledge, but fools despise wisdom and instruction.",
				"KJV": "<sup>7</sup>The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction.",
				"NVI": "<sup>7</sup>El temor del SEÑOR es el principio del conocimiento; los necios desprecian la sabiduría y la disciplina."
			}
		},
		{
			"order": 8,
			"reference": "Proverbs 3:5-6",
			"texts": {
				"NIV": "<sup>5</sup>Trust in the LORD with all your heart and lean not on your own understanding; <sup>6</sup>in all your ways submit to him, and he will make your paths straight.",
				"KJV": "<sup>5</sup>Trust in the LORD with all thine heart; and lean not unto thine own understanding. <sup>6</sup>In all thy ways acknowledge him, and he shall direct thy paths.",
				"NVI": "<sup>5</sup>Confía en el SEÑOR de todo corazón, y no en tu propia inteligencia. <sup>6</sup>Reconócelo en todos tus caminos, y él allanará tus sendas."
			}
		},
		{
			"order": 9,
			"reference": "Proverbs 16:3-4",
			"texts": {
				"NIV": "<sup>3</sup>Commit to the LORD whatever you do, and he will establish your plans. <sup>4</sup>The LORD works out everything to its proper end—even the wicked for a day of disaster.",
				"KJV": "<sup>3</sup>Commit thy works unto the LORD, and thy thoughts shall be established. <sup>4</sup>The LORD hath made all things for himself: yea, even the wicked for the day of evil.",
				"NVI": "<sup>3</sup>Pon en manos del SEÑOR todas tus obras, y tus proyectos se cumplirán. <sup>4</sup>Toda obra del SEÑOR tiene un propósito; ¡hasta el malvado fue hecho para el día del desastre!"
			}
		},
		{
			"order": 10,
			"reference": "Proverbs 16:18-19",
			"texts": {
				"NIV": "<sup>18</sup>Pride goes before destruction, a haughty spirit before a fall. <sup>19</sup>Better to be lowly in spirit along with the oppressed than to share plunder with the proud.",
				"KJV": "<sup>18</sup>Pride goeth before destruction, and an haughty spirit before a fall. <sup>19</sup>Better it is to be of an humble spirit with the lowly, than to divide the spoil with the proud.",
				"NVI": "<sup>18</sup>Al orgullo le sigue la destrucción; a la altanería, el fracaso. <sup>19</sup>Vale más humillarse con los oprimidos que compartir el botín con los orgullosos."
			}
		},
		{
			"order": 11,
			"reference": "Isaiah 12:2",
			"texts": {
				"NIV": "<sup>2</sup>Surely God is my salvation; I will trust and not be afraid. The LORD, the LORD himself, is my strength and my defense; he has become my salvation.",
				"KJV": "<sup>2</sup>Behold, God is my salvation; I will trust, and not be afraid: for the LORD JEHOVAH is my strength and my song; he also is become my salvation.",
				"NVI": "<sup>2</sup>¡Dios es mi salvación! Confiaré en él y no temeré. El SEÑOR es mi fuerza, el SEÑOR es mi canción; ¡él es mi salvación!"
			}
		},
		{
			"order": 12,
			"reference": "Lamentations 3:22-23",
			"texts": {
				"NIV": "<sup>22</sup>Because of the LORD's great love we are not consumed, for his compassions never fail. <sup>23</sup>They are new every morning; great is your faithfulness.",
				"KJV": "<sup>22</sup>It is of the LORD's mercies that we are not consumed, because his compassions fail not. <sup>23</sup>They are new every morning: great is thy faithfulness.",
				"NVI": "<sup>22</sup>El gran amor del SEÑOR nunca se acaba, y su compasión jamás se agota. <sup>23</sup>Cada mañana se renuevan sus bondades; ¡muy grande es su fidelidad!"
			}
		},
		{
			"order": 13,
			"reference": "Obadiah 1:15",
			"texts": {
				"NIV": "<sup>15</sup>The day of the LORD is near for all nations. As you have done, it will be done to you; your deeds will return upon your own head.",
				"KJV": "<sup>15</sup>For the day of the LORD is near upon all the heathen: as thou hast done, it shall be done unto thee: thy reward shall return upon thine own head.",
				"NVI": "<sup>15</sup>Porque cercano está el día del SEÑOR contra todas las naciones. ¡Edom, como hiciste, se te hará! ¡Sobre tu cabeza recaerá tu merecido!"
			}
		},
		{
			"order": 14,
			"reference": "Zephaniah 2:3",
			"texts": {
				"NIV": "<sup>3</sup>Seek the LORD, all you humble of the land, you who do what he commands. Seek righteousness, seek humility; perhaps you will be sheltered on the day of the LORD's anger.",
				"KJV": "<sup>3</sup>Seek ye the LORD, all ye meek of the earth, which have wrought his judgment; seek righteousness, seek meekness: it may be ye shall be hid in the day of the LORD's anger.",
				"NVI": "<sup>3</sup>Busquen al SEÑOR, todos los humildes de la tierra, los que siguen sus justos decretos. Busquen la justicia, busquen la humildad; tal vez encuentren refugio en el día de la ira del SEÑOR."
			}
		},
		{
			"order": 15,
			"reference": "Zephaniah 3:17",
			"texts": {
				"NIV": "<sup>17</sup>The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
				"KJV": "<sup>17</sup>The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing.",
				"NVI": "<sup>17</sup>El SEÑOR tu Dios está en medio de ti como guerrero victorioso. Se deleitará en ti con gozo, te renovará con su amor, se alegrará por ti con cantos."
			}
		},
		{
			"order": 16,
			"reference": "Matthew 5:3-12",
			"texts": {
				"NIV": "<sup>3</sup>Blessed are the poor in spirit, for theirs is the kingdom of heaven. <sup>4</sup>Blessed are those who mourn, for they will be comforted. <sup>5</sup>Blessed are the meek, for they will inherit the earth. <sup>6</sup>Blessed are those who hunger and thirst for righteousness, for they will be filled. <sup>7</sup>Blessed are the merciful, for they will be shown mercy. <sup>8</sup>Blessed are the pure in heart, for they will see God. <sup>9</sup>Blessed are the peacemakers, for they will be called children of God. <sup>10</sup>Blessed are those who are persecuted because of righteousness, for theirs is the kingdom of heaven. <sup>11</sup>Blessed are you when people insult you, persecute you and falsely say all kinds of evil against you because of me. <sup>12</sup>Rejoice and be glad, because great is your reward in heaven, for in the same way they persecuted the prophets who were before you.",
				"KJV": "<sup>3</sup>Blessed are the poor in spirit: for theirs is the kingdom of heaven. <sup>4</sup>Blessed are they that mourn: for they shall be comforted. <sup>5</sup>Blessed are the meek: for they shall inherit the earth. <sup>6</sup>Blessed are they which do hunger and thirst after righteousness: for they shall be filled. <sup>7</sup>Blessed are the merciful: for they shall obtain mercy. <sup>8</sup>Blessed are the pure in heart: for they shall see God. <sup>9</sup>Blessed are the peacemakers: for they shall be called the children of God. <sup>10</sup>Blessed are they which are persecuted for righteousness' sake: for theirs is the kingdom of heaven. <sup>11</sup>Blessed are ye, when men shall revile you, and persecute you, and shall say all manner of evil against you falsely, for my sake. <sup>12</sup>Rejoice, and be exceeding glad: for great is your reward in heaven: for so persecuted they the prophets which were before you.",
				"NVI": "<sup>3</sup>Dichosos los pobres en espíritu, porque el reino de los cielos les pertenece. <sup>4</sup>Dichosos los que lloran, porque serán consolados. <sup>5</sup>Dichosos los humildes, porque recibirán la tierra como herencia. <sup>6</sup>Dichosos los que tienen hambre y sed de justicia, porque serán saciados. <sup>7</sup>Dichosos los compasivos, porque serán tratados con compasión. <sup>8</sup>Dichosos los de corazón limpio, porque ellos verán a Dios. <sup>9</sup>Dichosos los que trabajan por la paz, porque serán llamados hijos de Dios. <sup>10</sup>Dichosos los perseguidos por causa de la justicia, porque el reino de los cielos les pertenece. <sup>11</sup>Dichosos serán ustedes cuando por mi causa la gente los insulte, los persiga y levante contra ustedes toda clase de calumnias. <sup>12</sup>Alégrense y llénense de júbilo, porque les espera una gran recompensa en el cielo. Así también persiguieron a los profetas que los precedieron a ustedes."
			}
		},
		{
			"order": 17,
			"reference": "Matthew 5:16",
			"texts": {
				"NIV": "<sup>16</sup>In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven.",
				"KJV": "<sup>16</sup>Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.",
				"NVI": "<sup>16</sup>Hagan brillar su luz delante de todos, para que ellos puedan ver las buenas obras de ustedes y alaben al Padre que está en el cielo."
			}
		},
		{
			"order": 18,
			"reference": "Matthew 19:26",
			"texts": {
				"NIV": "<sup>26</sup>Jesus looked at them and said, \"With man this is impossible, but with God all things are possible.\"",
				"KJV": "<sup>26</sup>But Jesus beheld them, and said unto them, With men this is impossible; but with God all things are possible.",
				"NVI": "<sup>26</sup>Para los hombres es imposible —aclaró Jesús, mirándolos fijamente—, mas para Dios todo es posible."
			}
		},
		{
			"order": 19,
			"reference": "Mark 10:45",
			"texts": {
				"NIV": "<sup>45</sup>For even the Son of Man did not come to be served, but to serve, and to give his life as a ransom for many.",
				"KJV": "<sup>45</sup>For even the Son of man came not to be ministered unto, but to minister, and to give his life a ransom for many.",
				"NVI": "<sup>45</sup>Porque ni aun el Hijo del hombre vino para que le sirvan, sino para servir y para dar su vida en rescate por muchos."
			}
		},
		{
			"order": 20,
			"reference": "Luke 19:10",
			"texts": {
				"NIV": "<sup>10</sup>For the Son of Man came to seek and to save the lost.",
				"KJV": "<sup>10</sup>For the Son of man is come to seek and to save that which was lost.",
				"NVI": "<sup>10</sup>Porque el Hijo del hombre vino a buscar y a salvar lo que se había perdido."
			}
		},
		{
			"order": 21,
			"reference": "John 10:10",
			"texts": {
				"NIV": "<sup>10</sup>The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full.",
				"KJV": "<sup>10</sup>The thief cometh not, but for to steal, and to kill, and to destroy: I am come that they might have life, and that they might have it more abundantly.",
				"NVI": "<sup>10</sup>El ladrón no viene sino para robar y matar y destruir; yo he venido para que tengan vida, y para que la tengan en abundancia."
			}
		},
		{
			"order": 22,
			"reference": "Acts 1:8",
			"texts": {
				"NIV": "<sup>8</sup>But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.",
				"KJV": "<sup>8</sup>But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.",
				"NVI": "<sup>8</sup>Pero cuando venga el Espíritu Santo sobre ustedes, recibirán poder y serán mis testigos tanto en Jerusalén como en toda Judea y Samaria, y hasta los confines de la tierra."
			}
		},
		{
			"order": 23,
			"reference": "Romans 1:16",
			"texts": {
				"NIV": "<sup>16</sup>For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile.",
				"KJV": "<sup>16</sup>For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth; to the Jew first, and also to the Greek.",
				"NVI": "<sup>16</sup>No me avergüenzo del evangelio, pues es poder de Dios para la salvación de todos los que creen: de los judíos primeramente, pero también de los gentiles."
			}
		},
		{
			"order": 24,
			"reference": "1 Corinthians 13:13",
			"texts": {
				"NIV": "<sup>13</sup>And now these three remain: faith, hope and love. But the greatest of these is love.",
				"KJV": "<sup>13</sup>And now abideth faith, hope, charity, these three; but the greatest of these is charity.",
				"NVI": "<sup>13</sup>Ahora, pues, permanecen estas tres virtudes: la fe, la esperanza y el amor. Pero la más excelente de ellas es el amor."
			}
		},
		{
			"order": 25,
			"reference": "1 Corinthians 16:13-14",
			"texts": {
				"NIV": "<sup>13</sup>Be on your guard; stand firm in the faith; be courageous; be strong. <sup>14</sup>Do everything in love.",
				"KJV": "<sup>13</sup>Watch ye, stand fast in the faith, quit you like men, be strong. <sup>14</sup>Let all your things be done with charity.",
				"NVI": "<sup>13</sup>Manténganse alerta; permanezcan firmes en la fe; sean valientes y fuertes. <sup>14</sup>Hagan todo con amor."
			}
		},
		{
			"order": 26,
			"reference": "2 Corinthians 2:14",
			"texts": {
				"NIV": "<sup>14</sup>But thanks be to God, who always leads us as captives in Christ's triumphal procession and uses us to spread the aroma of the knowledge of him everywhere.",
				"KJV": "<sup>14</sup>Now thanks be unto God, which always causeth us to triumph in Christ, and maketh manifest the savour of his knowledge by us in every place.",
				"NVI": "<sup>14</sup>Sin embargo, gracias a Dios que en Cristo siempre nos lleva triunfantes y, por medio de nosotros, esparce por todas partes la fragancia de su conocimiento."
			}
		},
		{
			"order": 27,
			"reference": "Galatians 5:22-23",
			"texts": {
				"NIV": "<sup>22</sup>But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, <sup>23</sup>gentleness and self-control. Against such things there is no law.",
				"KJV": "<sup>22</sup>But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, <sup>23</sup>Meekness, temperance: against such there is no law.",
				"NVI": "<sup>22</sup>En cambio, el fruto del Espíritu es amor, alegría, paz, paciencia, amabilidad, bondad, fidelidad, <sup>23</sup>humildad y dominio propio. No hay ley que condene estas cosas."
			}
		},
		{
			"order": 28,
			"reference": "Ephesians 2:10",
			"texts": {
				"NIV": "<sup>10</sup>For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.",
				"KJV": "<sup>10</sup>For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.",
				"NVI": "<sup>10</sup>Porque somos hechura de Dios, creados en Cristo Jesús para buenas obras, las cuales Dios dispuso de antemano a fin de que las pongamos en práctica."
			}
		},
		{
			"order": 29,
			"reference": "1 Thessalonians 5:19-22",
			"texts": {
				"NIV": "<sup>19</sup>Do not quench the Spirit. <sup>20</sup>Do not treat prophecies with contempt <sup>21</sup>but test them all; hold on to what is good, <sup>22</sup>reject every kind of evil.",
				"KJV": "<sup>19</sup>Quench not the Spirit. <sup>20</sup>Despise not prophesyings. <sup>21</sup>Prove all things; hold fast that which is good. <sup>22</sup>Abstain from all appearance of evil.",
				"NVI": "<sup>19</sup>No apaguen el Espíritu, <sup>20</sup>no desprecien las profecías, <sup>21</sup>sométanlo todo a prueba, aférrense a lo bueno, <sup>22</sup>eviten toda clase de mal."
			}
		},
		{
			"order": 30,
			"reference": "2 Timothy 1:7",
			"texts": {
				"NIV": "<sup>7</sup>For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.",
				"KJV": "<sup>7</sup>For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
				"NVI": "<sup>7</sup>Pues Dios no nos ha dado un espíritu de timidez, sino de poder, de amor y de dominio propio."
			}
		},
		{
			"order": 31,
			"reference": "Hebrews 12:1-2",
			"texts": {
				"NIV": "<sup>1</sup>Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us, <sup>2</sup>fixing our eyes on Jesus, the pioneer and perfecter of faith. For the joy set before him he endured the cross, scorning its shame, and sat down at the right hand of the throne of God.",
				"KJV": "<sup>1</sup>Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us, <sup>2</sup>Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God.",
				"NVI": "<sup>1</sup>Por tanto, también nosotros, que estamos rodeados de una multitud tan grande de testigos, despojémonos del lastre que nos estorba, en especial del pecado que nos asedia, y corramos con perseverancia la carrera que tenemos por delante. <sup>2</sup>Fijemos la mirada en Jesús, el iniciador y perfeccionador de nuestra fe, quien por el gozo que le esperaba, soportó la cruz, menospreciando la vergüenza que ella significaba, y ahora está sentado a la derecha del trono de Dios."
			}
		}
	]
}
```

## Implementation Details

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { AdminLoginPage } from './page-objects/admin-login.page';
import { MinistrySetupPage } from './page-objects/ministry-setup.page';
import { BibleBeeConfigPage } from './page-objects/bible-bee-config.page';
import { RegistrationPage } from './page-objects/registration.page';
import { BibleBeeEnrollmentPage } from './page-objects/bible-bee-enrollment.page';
import { StudentProgressPage } from './page-objects/student-progress.page';

test('End-to-end Bible Bee ministry flow', async ({ page }) => {
	// Test implementation here
});
```

### Key Milestones

1. Admin successfully sets up Bible Bee ministry with two divisions
2. Scripture data is successfully imported from both CSV and JSON formats
3. Family registration is completed successfully
4. Children appear in auto-enrollment preview
5. Enrollment is completed successfully
6. Progress cards show correctly for both children
7. Scripture list and essay requirements display correctly

## Resources

- [Bible Bee Feature Documentation](docs/BIBLE_BEE.md)
- [Admin User Guide](docs/ADMIN_GUIDE.md)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [UI Component Reference](src/components/README.md)

## Time Estimate

- Implementation: 12-16 hours
- Documentation: 2-3 hours
- Testing and refinement: 4-6 hours

Total: 18-25 hours

## Additional Notes

The script should be designed to be used in both automated CI/CD pipelines and for manual testing. Include clear instructions for setting up the test environment and handling any prerequisites.

Consideration should be given to making the test data randomized enough to avoid conflicts when tests are run multiple times, but consistent enough for reproducible results.
