export type Language = 'English' | 'Vietnamese' | 'Spanish' | 'Japanese' | 'Korean' | 'French' | 'German' | 'Portuguese' | 'Chinese';

type Translation = {
  settings: string;
  settingsDescription: string;
  autoSaved: string;
  section: string;
  preferences: string;
  reset: string;
  nav: Record<string, string>;
  descriptions: Record<string, string>;
  language: string;
  theme: string;
  reducedMotion: string;
  uiScale: string;
};

const english: Translation = {
  settings: 'SETTINGS',
  settingsDescription: 'Manage your Aura Battle experience.',
  autoSaved: 'ALL CHANGES AUTO-SAVED',
  section: 'SECTION',
  preferences: 'PLAYER PREFERENCES',
  reset: 'RESET TO DEFAULT',
  nav: { GENERAL: 'GENERAL', AUDIO: 'AUDIO', VIDEO: 'VIDEO', CONTROLS: 'CONTROLS', CAMERA: 'CAMERA', PRIVACY: 'PRIVACY', NOTIFICATIONS: 'NOTIFICATIONS', ACCOUNT: 'ACCOUNT' },
  descriptions: { GENERAL: 'Your core game preferences.', AUDIO: 'Balance the soundscape of the arena.', VIDEO: 'Tune visual quality for your device.', CONTROLS: 'Your keyboard mapping for the arena.', CAMERA: 'Camera access is only requested when you enable it.', PRIVACY: 'Choose how other players can reach you.', NOTIFICATIONS: 'Control what appears in your inbox.', ACCOUNT: 'Your player identity and account controls.' },
  language: 'Language', theme: 'Theme', reducedMotion: 'Reduced Motion', uiScale: 'UI Scale',
};

export const translations: Record<Language, Translation> = {
  English: english,
  Vietnamese: { ...english, settings: 'CÀI ĐẶT', settingsDescription: 'Quản lý trải nghiệm Aura Battle của bạn.', autoSaved: 'MỌI THAY ĐỔI ĐÃ TỰ ĐỘNG LƯU', section: 'MỤC', preferences: 'TÙY CHỌN NGƯỜI CHƠI', reset: 'ĐẶT LẠI MẶC ĐỊNH', nav: { GENERAL: 'CHUNG', AUDIO: 'ÂM THANH', VIDEO: 'HÌNH ẢNH', CONTROLS: 'ĐIỀU KHIỂN', CAMERA: 'CAMERA', PRIVACY: 'RIÊNG TƯ', NOTIFICATIONS: 'THÔNG BÁO', ACCOUNT: 'TÀI KHOẢN' }, descriptions: { GENERAL: 'Tùy chọn chính của trò chơi.', AUDIO: 'Điều chỉnh âm thanh trong đấu trường.', VIDEO: 'Tối ưu chất lượng hình ảnh cho thiết bị.', CONTROLS: 'Thiết lập bàn phím cho đấu trường.', CAMERA: 'Chỉ yêu cầu quyền camera khi bạn bật.', PRIVACY: 'Chọn cách người chơi khác liên hệ với bạn.', NOTIFICATIONS: 'Kiểm soát nội dung xuất hiện trong hộp thư.', ACCOUNT: 'Thông tin và tùy chọn tài khoản.' }, language: 'Ngôn ngữ', theme: 'Chủ đề', reducedMotion: 'Giảm chuyển động', uiScale: 'Tỷ lệ giao diện' },
  Spanish: { ...english, settings: 'AJUSTES', settingsDescription: 'Gestiona tu experiencia de Aura Battle.', autoSaved: 'CAMBIOS GUARDADOS AUTOMÁTICAMENTE', section: 'SECCIÓN', preferences: 'PREFERENCIAS DEL JUGADOR', reset: 'RESTABLECER', nav: { ...english.nav, GENERAL: 'GENERAL', AUDIO: 'AUDIO', VIDEO: 'VÍDEO', CONTROLS: 'CONTROLES', PRIVACY: 'PRIVACIDAD', NOTIFICATIONS: 'NOTIFICACIONES', ACCOUNT: 'CUENTA' }, descriptions: { ...english.descriptions, GENERAL: 'Preferencias principales del juego.', AUDIO: 'Ajusta el sonido de la arena.', VIDEO: 'Configura la calidad visual.', PRIVACY: 'Elige cómo pueden contactarte.', ACCOUNT: 'Identidad y controles de tu cuenta.' }, language: 'Idioma', theme: 'Tema', reducedMotion: 'Reducir movimiento', uiScale: 'Escala de interfaz' },
  Japanese: { ...english, settings: '設定', settingsDescription: 'Aura Battle の体験を管理します。', autoSaved: '変更は自動保存されます', section: '項目', preferences: 'プレイヤー設定', reset: '初期設定に戻す', nav: { ...english.nav, GENERAL: '一般', AUDIO: 'オーディオ', VIDEO: 'ビデオ', CONTROLS: '操作', CAMERA: 'カメラ', PRIVACY: 'プライバシー', NOTIFICATIONS: '通知', ACCOUNT: 'アカウント' }, descriptions: { ...english.descriptions, GENERAL: '基本ゲーム設定。', AUDIO: 'アリーナの音量を調整します。', VIDEO: '画質を調整します。', ACCOUNT: 'プレイヤー情報とアカウント設定。' }, language: '言語', theme: 'テーマ', reducedMotion: 'モーションを減らす', uiScale: 'UI スケール' },
  Korean: { ...english, settings: '설정', settingsDescription: 'Aura Battle 환경을 관리합니다.', autoSaved: '모든 변경 사항이 자동 저장됩니다', section: '섹션', preferences: '플레이어 설정', reset: '기본값으로 재설정', nav: { ...english.nav, GENERAL: '일반', AUDIO: '오디오', VIDEO: '비디오', CONTROLS: '컨트롤', CAMERA: '카메라', PRIVACY: '개인정보', NOTIFICATIONS: '알림', ACCOUNT: '계정' }, descriptions: { ...english.descriptions, GENERAL: '기본 게임 설정입니다.', AUDIO: '아레나 사운드를 조절합니다.', VIDEO: '기기 화질을 조절합니다.', ACCOUNT: '플레이어 정보와 계정 설정입니다.' }, language: '언어', theme: '테마', reducedMotion: '모션 줄이기', uiScale: 'UI 크기' },
  French: { ...english, settings: 'PARAMÈTRES', settingsDescription: 'Gérez votre expérience Aura Battle.', autoSaved: 'MODIFICATIONS ENREGISTRÉES', section: 'SECTION', preferences: 'PRÉFÉRENCES DU JOUEUR', reset: 'RÉINITIALISER', nav: { ...english.nav, GENERAL: 'GÉNÉRAL', AUDIO: 'AUDIO', VIDEO: 'VIDÉO', CONTROLS: 'COMMANDES', PRIVACY: 'CONFIDENTIALITÉ', NOTIFICATIONS: 'NOTIFICATIONS', ACCOUNT: 'COMPTE' }, descriptions: { ...english.descriptions, GENERAL: 'Préférences principales du jeu.', AUDIO: "Réglez l'ambiance sonore de l'arène.", VIDEO: 'Réglez la qualité visuelle.', ACCOUNT: 'Identité et contrôles du compte.' }, language: 'Langue', theme: 'Thème', reducedMotion: 'Réduire les mouvements', uiScale: "Échelle de l'interface" },
  German: { ...english, settings: 'EINSTELLUNGEN', settingsDescription: 'Verwalte dein Aura-Battle-Erlebnis.', autoSaved: 'ALLE ÄNDERUNGEN AUTOMATISCH GESPEICHERT', section: 'BEREICH', preferences: 'SPIELEROPTIONEN', reset: 'ZURÜCKSETZEN', nav: { ...english.nav, GENERAL: 'ALLGEMEIN', AUDIO: 'AUDIO', VIDEO: 'VIDEO', CONTROLS: 'STEUERUNG', PRIVACY: 'DATENSCHUTZ', NOTIFICATIONS: 'BENACHRICHTIGUNGEN', ACCOUNT: 'KONTO' }, descriptions: { ...english.descriptions, GENERAL: 'Deine grundlegenden Spieleinstellungen.', AUDIO: 'Regle den Arenasound.', VIDEO: 'Passe die Grafikqualität an.', ACCOUNT: 'Spieleridentität und Kontoeinstellungen.' }, language: 'Sprache', theme: 'Design', reducedMotion: 'Weniger Bewegung', uiScale: 'UI-Skalierung' },
  Portuguese: { ...english, settings: 'CONFIGURAÇÕES', settingsDescription: 'Gerencie sua experiência no Aura Battle.', autoSaved: 'ALTERAÇÕES SALVAS AUTOMATICAMENTE', section: 'SEÇÃO', preferences: 'PREFERÊNCIAS DO JOGADOR', reset: 'REDEFINIR PADRÕES', nav: { ...english.nav, GENERAL: 'GERAL', AUDIO: 'ÁUDIO', VIDEO: 'VÍDEO', CONTROLS: 'CONTROLES', PRIVACY: 'PRIVACIDADE', NOTIFICATIONS: 'NOTIFICAÇÕES', ACCOUNT: 'CONTA' }, descriptions: { ...english.descriptions, GENERAL: 'Preferências principais do jogo.', AUDIO: 'Ajuste o som da arena.', VIDEO: 'Ajuste a qualidade visual.', ACCOUNT: 'Identidade e controles da conta.' }, language: 'Idioma', theme: 'Tema', reducedMotion: 'Reduzir movimento', uiScale: 'Escala da interface' },
  Chinese: { ...english, settings: '设置', settingsDescription: '管理你的 Aura Battle 体验。', autoSaved: '所有更改已自动保存', section: '分类', preferences: '玩家偏好', reset: '恢复默认设置', nav: { ...english.nav, GENERAL: '常规', AUDIO: '音频', VIDEO: '视频', CONTROLS: '操作', CAMERA: '摄像头', PRIVACY: '隐私', NOTIFICATIONS: '通知', ACCOUNT: '账户' }, descriptions: { ...english.descriptions, GENERAL: '游戏基本偏好设置。', AUDIO: '调整竞技场声音。', VIDEO: '调整画面质量。', ACCOUNT: '玩家身份和账户设置。' }, language: '语言', theme: '主题', reducedMotion: '减少动态效果', uiScale: '界面缩放' },
};

export const languageOptions = Object.keys(translations) as Language[];

export function getTranslation(language: string): Translation {
  return translations[language as Language] || english;
}

export function setDocumentLanguage(language: Language) {
  document.documentElement.lang = language === 'Vietnamese' ? 'vi' : language === 'Japanese' ? 'ja' : language === 'Korean' ? 'ko' : language === 'Chinese' ? 'zh' : language.slice(0, 2).toLowerCase();
}
