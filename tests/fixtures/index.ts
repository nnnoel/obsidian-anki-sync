import { readFileSync } from 'fs'
import { join } from 'path'

export const vietnameseNote = readFileSync(
  join(__dirname, 'vietnamese_note.md'),
  'utf8'
)

export const expectedFlashcards = [
  {
    Front: 'Trân trọng',
    Back: 'Respectfully, with great respect',
    Usage: 'Often used in formal contexts.',
    Example: 'Tôi trân trọng cảm ơn bạn. <i>(I sincerely thank you.)</i>'
  },
  {
    Front: 'Sân khấu',
    Back: 'Stage',
    Usage: 'Refers to a performance or presentation stage.',
    Example: 'Cô ấy bước lên sân khấu. <i>(She stepped onto the stage.)</i>'
  },
  {
    Front: 'Mà',
    Back: 'A versatile connector word with various meanings depending on context',
    Context: '<ol>\n  <li><b>But/and:</b> <i>Anh ấy thông minh mà khiêm tốn.</i> <i>(He is smart and humble.)</i></li>\n  <li><b>Emphasis:</b> <i>Tôi đã nói rồi mà.</i> <i>(I already told you, you know.)</i></li>\n  <li><b>Reason:</b> <i>Tôi không đi được mà trời mưa to quá.</i> <i>(I cannot go because it is raining heavily.)</i></li>\n  <li><b>Relative clause:</b> <i>Cuốn sách mà tôi đang đọc rất hay.</i> <i>(The book that I am reading is very good.)</i></li>\n  <li><b>Exclamation:</b> <i>Đẹp quá mà!</i> <i>(So beautiful, wow!)</i></li>\n</ol>'
  },
  {
    Front: 'Vô duyên',
    Back: 'Tactless, ungracious, inappropriate, or lacking charm/social grace',
    Usage: 'Used to describe someone whose behavior is awkward, inappropriate, or lacking in social tact. Can also be used humorously or playfully in certain contexts.',
    Example: '<ol>\n  <li>"Anh ấy nói chuyện vô duyên." <i>He speaks tactlessly.</i></li>\n  <li>"Đùa gì mà vô duyên thế?" <i>What kind of joke is that? So awkward!</i></li>\n  <li>"Cô ấy rất vô duyên khi không hiểu ý của người khác." <i>She is very ungracious when she doesn\'t understand others\' intentions.</i></li>\n</ol>'
  },
  {
    Front: 'Khán thính giả',
    Back: 'Viewers and listeners, audience',
    Usage: 'A formal and polite way to address an audience, particularly in media contexts. It combines both viewers (<i>khán giả</i>) and listeners (<i>thính giả</i>), commonly used in programs like podcasts, TV shows, or radio broadcasts.',
    Example: '<ol>\n  <li>"À xin chào tất cả các khán thính giả đang nghe cái podcast ngày hôm nay." <i>Ah, hello to all the audience members listening to today\'s podcast.</i></li>\n  <li>"Chúng tôi rất biết ơn sự ủng hộ của các khán thính giả." <i>We are very grateful for the support of our audience.</i></li>\n</ol>'
  },
  {
    Front: 'Đảm bảo',
    Back: 'To ensure, to guarantee',
    Usage: 'Used to express a commitment to making sure something happens or meets certain conditions. Common in formal, business, or casual contexts.',
    Example: '<ol>\n  <li>"Tôi đảm bảo rằng dự án sẽ hoàn thành đúng hạn." <i>I ensure that the project will be completed on time.</i></li>\n  <li>"Công ty cam kết đảm bảo chất lượng sản phẩm." <i>The company guarantees the quality of its products.</i></li>\n  <li>"Bạn hãy đảm bảo rằng mọi thứ đã được chuẩn bị kỹ lưỡng." <i>Make sure everything is well prepared.</i></li>\n</ol>'
  },
  {
    Front: 'Trưng bày',
    Back: 'To display, exhibit, or showcase something publicly',
    Usage: 'Commonly used for museums, exhibitions, or galleries.',
    Example: 'Những bức tranh này sẽ được trưng bày trong bảo tàng. <i>(These paintings will be displayed in the museum.)</i>'
  }
]
