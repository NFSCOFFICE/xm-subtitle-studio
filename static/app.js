const form = document.getElementById("upload-form");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const uiLocale = document.getElementById("ui-locale");
const previewGrid = document.getElementById("preview-grid");
const videoInput = document.getElementById("video-input");
const videoPreview = document.getElementById("video-preview");
const audioPreview = document.getElementById("audio-preview");
const audioPlayerWrap = document.getElementById("audio-player-wrap");
const audioPlayer = document.getElementById("audio-player");
const videoStage = document.querySelector(".video-stage");
const subtitleOverlay = document.getElementById("subtitle-overlay");
const previewSpeaker = document.getElementById("preview-speaker");
const previewStart = document.getElementById("preview-start");
const previewEnd = document.getElementById("preview-end");
const previewText = document.getElementById("preview-text");
const previewEditNote = document.getElementById("preview-edit-note");
const fileName = document.getElementById("file-name");
const language = document.getElementById("language");
const translateTo = document.getElementById("translate-to");
const modelSize = document.getElementById("model-size");
const diarization = document.getElementById("diarization");
const speakerCount = document.getElementById("speaker-count");
const smartSplit = document.getElementById("smart-split");
const assStyle = document.getElementById("ass-style");
const presetChips = Array.from(document.querySelectorAll("[data-preset]"));
const summaryPreset = document.getElementById("summary-preset");
const summaryLanguage = document.getElementById("summary-language");
const summaryModel = document.getElementById("summary-model");
const summaryEnhancement = document.getElementById("summary-enhancement");
const actionNote = document.getElementById("action-note");
const deliveryPanel = document.getElementById("delivery-panel");
const submitButton = document.getElementById("submit-button");
const jobCard = document.getElementById("job-card");
const jobStatusText = document.getElementById("job-status-text");
const jobPill = document.getElementById("job-pill");
const jobMessage = document.getElementById("job-message");
const jobLanguage = document.getElementById("job-language");
const progressBar = document.getElementById("progress-bar");
const jobList = document.getElementById("job-list");
const jobFilter = document.getElementById("job-filter");
const pollToggleButton = document.getElementById("poll-toggle-button");
const runtimeGuide = document.getElementById("runtime-guide");
const runtimeSteps = Array.from(document.querySelectorAll("[data-step]"));
const pendingOutputGroup = document.getElementById("pending-output-group");
const downloadGroup = document.getElementById("download-group");
const downloadBundleLink = document.getElementById("download-bundle-link");
const downloadSrtLink = document.getElementById("download-srt-link");
const downloadVttLink = document.getElementById("download-vtt-link");
const downloadTxtLink = document.getElementById("download-txt-link");
const downloadJsonLink = document.getElementById("download-json-link");
const downloadMdLink = document.getElementById("download-md-link");
const downloadDocxLink = document.getElementById("download-docx-link");
const downloadAssLink = document.getElementById("download-ass-link");
const downloadBilingualSrtLink = document.getElementById("download-bilingual-srt-link");
const downloadBilingualTxtLink = document.getElementById("download-bilingual-txt-link");
const downloadBilingualMdLink = document.getElementById("download-bilingual-md-link");
const downloadBilingualDocxLink = document.getElementById("download-bilingual-docx-link");
const downloadBilingualAssLink = document.getElementById("download-bilingual-ass-link");
const editorCard = document.getElementById("editor-card");
const editorTitle = document.getElementById("editor-title");
const editorList = document.getElementById("editor-list");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const addSegmentButton = document.getElementById("add-segment-button");
const saveEditorButton = document.getElementById("save-editor-button");
const editorDraftState = document.getElementById("editor-draft-state");
const qcFixButton = document.getElementById("qc-fix-button");
const qcFixFormatButton = document.getElementById("qc-fix-format-button");
const qcScanButton = document.getElementById("qc-scan-button");
const qcSummary = document.getElementById("qc-summary");
const qcList = document.getElementById("qc-list");
const i18nNodes = Array.from(document.querySelectorAll("[data-i18n]"));
const i18nPlaceholderNodes = Array.from(document.querySelectorAll("[data-i18n-placeholder]"));

let activeFiles = [];
let activeJobId = null;
let pollTimer = null;
let pollPaused = false;
let activeVideoUrl = null;
let activePreviewJobId = null;
let activePlaybackRange = null;
let historyDebounce = null;
let clickPreviewTimer = null;
let draftSaveTimer = null;
let activePreviewIndex = 0;
let activePreviewMode = "none";
let currentLocale = "zh-CN";
const jobs = new Map();
const editorStateByJob = new Map();
const UI_LOCALES = [
  { value: "zh-CN", label: "简中" },
  { value: "en", label: "EN" },
  { value: "ja", label: "日本語" },
  { value: "el", label: "ΕΛ" },
];
const LANGUAGE_OPTIONS = [
  { value: "auto", labels: { "zh-CN": "自动检测", en: "Auto detect", ja: "自動判定", el: "Αυτόματη ανίχνευση" } },
  { value: "zh", native: "中文" },
  { value: "en", native: "English" },
  { value: "ja", native: "日本語" },
  { value: "el", native: "Ελληνικά" },
  { value: "ko", native: "한국어" },
  { value: "es", native: "Español" },
  { value: "fr", native: "Français" },
  { value: "de", native: "Deutsch" },
  { value: "ru", native: "Русский" },
  { value: "it", native: "Italiano" },
  { value: "pt", native: "Português" },
  { value: "ar", native: "العربية" },
  { value: "tr", native: "Türkçe" },
  { value: "nl", native: "Nederlands" },
  { value: "pl", native: "Polski" },
];
const I18N = {
  "zh-CN": {
    meta_model: "Whisper large-v3",
    meta_offline: "本地离线",
    meta_outputs: "字幕 + 文稿",
    ui_language: "语言",
    panel_input_label: "新建任务",
    panel_input_title: "新建转写任务",
    panel_input_subline: "先导入媒体，再选择识别策略，最后直接提交处理。",
    panel_badge_local: "本地推理",
    stage_import_kicker: "导入媒体",
    stage_import_title: "导入媒体",
    stage_import_note: "音频与视频共用一个入口，直接进入转写流水线。",
    drop_title: "拖拽音频或视频到这里",
    drop_subtitle: "支持 MP3 / WAV / M4A / AAC / FLAC / OGG / MP4 / MOV / MKV / WEBM / AVI。",
    file_empty: "尚未选择文件",
    tag_batch: "批量导入",
    tag_extract: "视频抽轨",
    tag_offline: "本地离线",
    stage_setup_kicker: "识别设置",
    stage_setup_title: "识别设置",
    stage_setup_note: "先确定预设、语言和模型。",
    preset_balanced: "平衡",
    preset_speed: "极速",
    preset_delivery: "交付优先",
    field_language: "识别语言",
    field_model: "模型大小",
    model_large_v3: "large-v3（默认）",
    field_outputs: "标准输出",
    outputs_subtitle: "字幕：SRT / VTT / TXT / JSON / ASS",
    outputs_doc: "文稿：Markdown / DOCX",
    stage_delivery_kicker: "增强交付",
    stage_delivery_title: "增强交付",
    stage_delivery_note: "直接配置双语、说话人、断句和字幕风格。",
    field_translate: "双语翻译",
    field_diarization: "说话人分离",
    field_speakers: "说话人数",
    field_split: "断句优化",
    field_ass_style: "ASS 模板",
    option_off: "关闭",
    option_on_experimental: "开启（实验性）",
    option_on_recommended: "开启（推荐）",
    ass_variety: "综艺描边",
    ass_punch: "热词冲击",
    ass_neon: "霓虹字幕",
    summary_kicker: "任务摘要",
    submit_start: "开始批量转写",
    submit_busy: "正在部署转写任务...",
    runtime_label: "任务运行",
    runtime_title: "运行面板",
    runtime_subline: "这里会保留草稿、已完成历史和下载产物，刷新后自动恢复。",
    filter_all: "全部任务",
    filter_draft: "草稿",
    filter_running: "运行中",
    filter_completed: "已完成",
    filter_failed: "失败",
    poll_pause: "暂停轮询",
    poll_resume: "恢复轮询",
    preview_label: "实时预览",
    preview_title: "视频与字幕实时预览",
    quick_edit_label: "快速修改",
    quick_edit_title: "当前片段修改预览",
    timeline_label: "时间轴编辑",
    quality_label: "字幕质检",
    quality_title: "字幕质检面板",
    footer_copy: "© 2026 XM. All rights reserved.",
    preset_custom: "自定义",
    enhancement_default: "标准交付",
    enhancement_bilingual: "双语",
    enhancement_speaker: "说话人",
    enhancement_split: "断句优化",
    enhancement_ass: "ASS",
    note_action: "将生成 {model} 模型转写结果，输出 SRT / ASS / 文稿，可继续进入时间轴精修。",
    status_queued: "等待处理",
    status_running: "正在转写",
    status_completed: "字幕已生成",
    status_failed: "生成失败",
    status_paused: "已暂停",
    status_idle: "待命",
    status_draft: "草稿",
    status_processing: "处理中",
    empty_jobs_title: "当前筛选下没有任务",
    empty_jobs_meta: "切换筛选或继续提交新任务。",
    draft_saved_at: "草稿已保存 {time}",
    created_at: "创建于 {time}",
    delete_job: "删除任务",
    delete_failed: "删除失败",
    no_auto_fix: "当前没有可自动修复的问题。",
    no_format_fix: "当前没有可自动修复的格式问题。",
    fix_all_done: "已执行全量修复，自动处理 {count} 项质检问题。",
    fix_all_done_manual: "已执行全量修复，自动处理 {count} 项，仍有 {manual} 项可疑错词需人工确认。",
    fix_format_done: "已执行格式修复，自动处理 {count} 项质检问题。",
    fix_format_done_manual: "已执行格式修复，自动处理 {count} 项，仍有 {manual} 项可疑错词需人工确认。",
    draft_hint: "草稿会自动保存到本地任务仓库。",
    runtime_fact_status: "状态",
    runtime_fact_language: "默认语言",
    runtime_waiting_submit: "等待提交",
    runtime_flow_title: "处理流程",
    runtime_step_submit_title: "01 提交任务",
    runtime_step_submit_note: "导入媒体并开始转写",
    runtime_step_recognize_title: "02 识别处理中",
    runtime_step_recognize_note: "Whisper 本地推理与断句",
    runtime_step_deliver_title: "03 产物生成",
    runtime_step_deliver_note: "SRT / ASS / 文稿统一导出",
    runtime_step_refine_title: "04 继续精修",
    runtime_step_refine_note: "进入时间轴编辑与视频预览",
    runtime_history_title: "草稿与历史",
    pending_outputs_title: "待生成产物",
    pending_outputs_note: "任务完成后可一键下载 ZIP 和全部字幕文件。",
    format_srt: "SRT",
    format_ass: "ASS",
    format_txt: "TXT",
    format_docx: "DOCX",
    download_bundle: "下载全部 ZIP",
    download_srt: "下载 SRT",
    download_vtt: "下载 VTT",
    download_txt: "下载 TXT",
    download_json: "下载 JSON",
    download_md: "下载 Markdown",
    download_docx: "下载 DOCX",
    download_ass: "下载 ASS",
    download_bilingual_srt: "下载双语 SRT",
    download_bilingual_txt: "下载双语 TXT",
    download_bilingual_md: "下载双语 Markdown",
    download_bilingual_docx: "下载双语 DOCX",
    download_bilingual_ass: "下载双语 ASS",
    audio_preview_label: "音频预览",
    subtitle_preview_default: "综艺感字幕预览",
    preview_field_speaker: "说话人",
    preview_field_start: "开始",
    preview_field_end: "结束",
    preview_field_text: "字幕内容",
    preview_placeholder_speaker: "可留空",
    preview_placeholder_text: "选择左侧片段后可直接在这里修改",
    preview_edit_hint: "点选左侧时间轴任意片段，这里会立即进入修改状态。",
    preview_edit_sync: "这里修改会同步更新视频预览层和下方时间轴。",
    editor_title: "编辑字幕",
    editor_load_preview: "载入本地视频预览",
    editor_undo: "撤销",
    editor_redo: "重做",
    editor_add_segment: "新增一段",
    editor_save: "保存修改",
    editor_saving: "保存中...",
    editor_shortcuts: "支持键盘编辑、行内增删段、合并拆分。快捷键：Ctrl/Cmd + S 保存，Ctrl/Cmd + Enter 在当前段后新增。",
    qc_fix_format: "仅修格式",
    qc_fix_all: "修复全部",
    qc_scan: "重新扫描",
    draft_auto_saved: "草稿已自动保存 {time}",
    draft_saving: "草稿保存中...",
    draft_save_failed: "草稿保存失败",
    save_failed: "保存失败",
    save_saved: "正式字幕已保存，草稿已清空。",
    save_changes: "保存修改",
    delete_confirm: "删除任务“{name}”及其草稿、历史和导出文件？",
    submit_failed: "提交失败",
    upload_failed: "上传失败：{name}",
  },
  en: {
    meta_model: "Whisper large-v3",
    meta_offline: "Offline",
    meta_outputs: "Subtitles + Docs",
    ui_language: "Language",
    panel_input_label: "New Task",
    panel_input_title: "Create Transcription",
    panel_input_subline: "Import media, choose a recognition strategy, then submit directly.",
    panel_badge_local: "Local Inference",
    stage_import_kicker: "Media",
    stage_import_title: "Import Media",
    stage_import_note: "Audio and video share one intake path for the transcription pipeline.",
    drop_title: "Drop audio or video here",
    drop_subtitle: "Supports MP3 / WAV / M4A / AAC / FLAC / OGG / MP4 / MOV / MKV / WEBM / AVI.",
    file_empty: "No file selected",
    tag_batch: "Batch import",
    tag_extract: "Audio extract",
    tag_offline: "Offline",
    stage_setup_kicker: "Setup",
    stage_setup_title: "Recognition Setup",
    stage_setup_note: "Choose preset, language, and model.",
    preset_balanced: "Balanced",
    preset_speed: "Fast",
    preset_delivery: "Delivery",
    field_language: "Recognition language",
    field_model: "Model size",
    model_large_v3: "large-v3 (default)",
    field_outputs: "Outputs",
    outputs_subtitle: "Subtitles: SRT / VTT / TXT / JSON / ASS",
    outputs_doc: "Docs: Markdown / DOCX",
    stage_delivery_kicker: "Delivery",
    stage_delivery_title: "Delivery Boost",
    stage_delivery_note: "Configure bilingual output, speakers, splitting, and subtitle style.",
    field_translate: "Bilingual translation",
    field_diarization: "Speaker diarization",
    field_speakers: "Speaker count",
    field_split: "Smart split",
    field_ass_style: "ASS style",
    option_off: "Off",
    option_on_experimental: "On (experimental)",
    option_on_recommended: "On (recommended)",
    ass_variety: "Variety stroke",
    ass_punch: "Punch emphasis",
    ass_neon: "Neon subtitle",
    summary_kicker: "Task Summary",
    submit_start: "Start Batch Transcription",
    submit_busy: "Submitting transcription jobs...",
    runtime_label: "Runtime",
    runtime_title: "Runtime Panel",
    runtime_subline: "Drafts, history, and downloads are restored after refresh.",
    filter_all: "All",
    filter_draft: "Drafts",
    filter_running: "Running",
    filter_completed: "Completed",
    filter_failed: "Failed",
    poll_pause: "Pause polling",
    poll_resume: "Resume polling",
    preview_label: "Preview",
    preview_title: "Live Video & Subtitle Preview",
    quick_edit_label: "Quick Edit",
    quick_edit_title: "Selected Segment Preview",
    timeline_label: "Timeline Editor",
    quality_label: "Quality Check",
    quality_title: "Subtitle QA Panel",
    footer_copy: "© 2026 XM. All rights reserved.",
    preset_custom: "Custom",
    enhancement_default: "Standard delivery",
    enhancement_bilingual: "Bilingual",
    enhancement_speaker: "Speakers",
    enhancement_split: "Smart split",
    enhancement_ass: "ASS",
    note_action: "Generates {model} transcripts with SRT / ASS / docs and continues into timeline refinement.",
    status_queued: "Queued",
    status_running: "Running",
    status_completed: "Completed",
    status_failed: "Failed",
    status_paused: "Paused",
    status_idle: "Idle",
    status_draft: "Draft",
    status_processing: "Processing",
    empty_jobs_title: "No jobs under this filter",
    empty_jobs_meta: "Change the filter or submit a new task.",
    draft_saved_at: "Draft saved {time}",
    created_at: "Created {time}",
    delete_job: "Delete job",
    delete_failed: "Delete failed",
    no_auto_fix: "There are no auto-fixable issues.",
    no_format_fix: "There are no auto-fixable formatting issues.",
    fix_all_done: "Full auto-fix applied to {count} issues.",
    fix_all_done_manual: "Full auto-fix handled {count} issues, with {manual} suspicious tokens left for review.",
    fix_format_done: "Formatting auto-fix applied to {count} issues.",
    fix_format_done_manual: "Formatting auto-fix handled {count} issues, with {manual} suspicious tokens left for review.",
    draft_hint: "Drafts are saved automatically to the local task store.",
    runtime_fact_status: "Status",
    runtime_fact_language: "Language",
    runtime_waiting_submit: "Waiting to submit",
    runtime_flow_title: "Pipeline",
    runtime_step_submit_title: "01 Submit job",
    runtime_step_submit_note: "Import media and start transcription",
    runtime_step_recognize_title: "02 Recognition",
    runtime_step_recognize_note: "Whisper local inference and splitting",
    runtime_step_deliver_title: "03 Deliverables",
    runtime_step_deliver_note: "Export SRT / ASS / docs together",
    runtime_step_refine_title: "04 Refine",
    runtime_step_refine_note: "Continue in timeline and preview",
    runtime_history_title: "Drafts & History",
    pending_outputs_title: "Pending outputs",
    pending_outputs_note: "Download ZIP and all subtitle files after completion.",
    format_srt: "SRT",
    format_ass: "ASS",
    format_txt: "TXT",
    format_docx: "DOCX",
    download_bundle: "Download ZIP",
    download_srt: "Download SRT",
    download_vtt: "Download VTT",
    download_txt: "Download TXT",
    download_json: "Download JSON",
    download_md: "Download Markdown",
    download_docx: "Download DOCX",
    download_ass: "Download ASS",
    download_bilingual_srt: "Download bilingual SRT",
    download_bilingual_txt: "Download bilingual TXT",
    download_bilingual_md: "Download bilingual Markdown",
    download_bilingual_docx: "Download bilingual DOCX",
    download_bilingual_ass: "Download bilingual ASS",
    audio_preview_label: "Audio Preview",
    subtitle_preview_default: "Subtitle preview",
    preview_field_speaker: "Speaker",
    preview_field_start: "Start",
    preview_field_end: "End",
    preview_field_text: "Subtitle text",
    preview_placeholder_speaker: "Optional",
    preview_placeholder_text: "Select a segment on the left to edit here",
    preview_edit_hint: "Select a timeline segment on the left to edit it here.",
    preview_edit_sync: "Changes here sync to the preview overlay and timeline below.",
    editor_title: "Edit Subtitles",
    editor_load_preview: "Load local video preview",
    editor_undo: "Undo",
    editor_redo: "Redo",
    editor_add_segment: "Add segment",
    editor_save: "Save changes",
    editor_saving: "Saving...",
    editor_shortcuts: "Keyboard editing is supported. Shortcuts: Ctrl/Cmd + S to save, Ctrl/Cmd + Enter to add a segment after the current one.",
    qc_fix_format: "Fix format only",
    qc_fix_all: "Fix all",
    qc_scan: "Rescan",
    draft_auto_saved: "Draft auto-saved {time}",
    draft_saving: "Saving draft...",
    draft_save_failed: "Failed to save draft",
    save_failed: "Save failed",
    save_saved: "Final subtitles saved and draft cleared.",
    save_changes: "Save changes",
    delete_confirm: "Delete job “{name}” and remove its draft, history, and exported files?",
    submit_failed: "Submit failed",
    upload_failed: "Upload failed: {name}",
  },
  ja: {
    meta_model: "Whisper large-v3",
    meta_offline: "ローカル処理",
    meta_outputs: "字幕 + 原稿",
    ui_language: "言語",
    panel_input_label: "新規タスク",
    panel_input_title: "文字起こしを作成",
    panel_input_subline: "メディアを読み込み、認識設定を選び、そのまま実行します。",
    panel_badge_local: "ローカル推論",
    stage_import_kicker: "メディア",
    stage_import_title: "メディア読込",
    stage_import_note: "音声と動画を同じ入口で受け取り、字幕処理に流します。",
    drop_title: "音声または動画をここへドロップ",
    drop_subtitle: "MP3 / WAV / M4A / AAC / FLAC / OGG / MP4 / MOV / MKV / WEBM / AVI に対応。",
    file_empty: "ファイル未選択",
    tag_batch: "一括取込",
    tag_extract: "音声抽出",
    tag_offline: "オフライン",
    stage_setup_kicker: "設定",
    stage_setup_title: "認識設定",
    stage_setup_note: "プリセット、言語、モデルを選択します。",
    preset_balanced: "標準",
    preset_speed: "高速",
    preset_delivery: "納品優先",
    field_language: "認識言語",
    field_model: "モデルサイズ",
    model_large_v3: "large-v3（既定）",
    field_outputs: "出力",
    outputs_subtitle: "字幕: SRT / VTT / TXT / JSON / ASS",
    outputs_doc: "原稿: Markdown / DOCX",
    stage_delivery_kicker: "納品拡張",
    stage_delivery_title: "強化納品",
    stage_delivery_note: "バイリンガル、話者、分割、字幕スタイルを直接設定します。",
    field_translate: "バイリンガル翻訳",
    field_diarization: "話者分離",
    field_speakers: "話者数",
    field_split: "文分割最適化",
    field_ass_style: "ASS スタイル",
    option_off: "オフ",
    option_on_experimental: "オン（実験）",
    option_on_recommended: "オン（推奨）",
    ass_variety: "バラエティ縁取り",
    ass_punch: "キーワード強調",
    ass_neon: "ネオン字幕",
    summary_kicker: "タスク概要",
    submit_start: "一括文字起こし開始",
    submit_busy: "文字起こしタスクを送信中...",
    runtime_label: "実行状況",
    runtime_title: "実行パネル",
    runtime_subline: "下書き、履歴、成果物は更新後も自動復元されます。",
    filter_all: "すべて",
    filter_draft: "下書き",
    filter_running: "実行中",
    filter_completed: "完了",
    filter_failed: "失敗",
    poll_pause: "ポーリング停止",
    poll_resume: "ポーリング再開",
    preview_label: "プレビュー",
    preview_title: "動画と字幕のライブプレビュー",
    quick_edit_label: "クイック編集",
    quick_edit_title: "選択セグメントの編集",
    timeline_label: "タイムライン編集",
    quality_label: "品質チェック",
    quality_title: "字幕品質パネル",
    footer_copy: "© 2026 XM. All rights reserved.",
    preset_custom: "カスタム",
    enhancement_default: "標準納品",
    enhancement_bilingual: "バイリンガル",
    enhancement_speaker: "話者",
    enhancement_split: "分割最適化",
    enhancement_ass: "ASS",
    note_action: "{model} で文字起こしを生成し、SRT / ASS / 原稿出力後にタイムライン編集へ進みます。",
    status_queued: "待機中",
    status_running: "処理中",
    status_completed: "完了",
    status_failed: "失敗",
    status_paused: "一時停止",
    status_idle: "待機",
    status_draft: "下書き",
    status_processing: "処理中",
    empty_jobs_title: "この条件ではタスクがありません",
    empty_jobs_meta: "フィルターを変えるか、新しいタスクを送信してください。",
    draft_saved_at: "下書き保存 {time}",
    created_at: "作成 {time}",
    delete_job: "タスク削除",
    no_auto_fix: "自動修正できる問題はありません。",
    no_format_fix: "自動修正できる書式問題はありません。",
    fix_all_done: "全体自動修正で {count} 件処理しました。",
    fix_all_done_manual: "全体自動修正で {count} 件処理し、{manual} 件は手動確認が必要です。",
    fix_format_done: "書式自動修正で {count} 件処理しました。",
    fix_format_done_manual: "書式自動修正で {count} 件処理し、{manual} 件は手動確認が必要です。",
    draft_hint: "下書きはローカルのタスク保存領域へ自動保存されます。",
    runtime_fact_status: "状態",
    runtime_fact_language: "言語",
    runtime_waiting_submit: "送信待ち",
    runtime_flow_title: "処理フロー",
    runtime_step_submit_title: "01 タスク送信",
    runtime_step_submit_note: "メディアを読み込んで文字起こしを開始",
    runtime_step_recognize_title: "02 認識処理",
    runtime_step_recognize_note: "Whisper のローカル推論と分割処理",
    runtime_step_deliver_title: "03 生成物出力",
    runtime_step_deliver_note: "SRT / ASS / 原稿をまとめて出力",
    runtime_step_refine_title: "04 仕上げ編集",
    runtime_step_refine_note: "タイムライン編集とプレビューへ進む",
    runtime_history_title: "下書きと履歴",
    pending_outputs_title: "生成待ちの出力",
    pending_outputs_note: "完了後に ZIP とすべての字幕ファイルをまとめて取得できます。",
    format_srt: "SRT",
    format_ass: "ASS",
    format_txt: "TXT",
    format_docx: "DOCX",
    download_bundle: "ZIP をダウンロード",
    download_srt: "SRT をダウンロード",
    download_vtt: "VTT をダウンロード",
    download_txt: "TXT をダウンロード",
    download_json: "JSON をダウンロード",
    download_md: "Markdown をダウンロード",
    download_docx: "DOCX をダウンロード",
    download_ass: "ASS をダウンロード",
    download_bilingual_srt: "二言語 SRT をダウンロード",
    download_bilingual_txt: "二言語 TXT をダウンロード",
    download_bilingual_md: "二言語 Markdown をダウンロード",
    download_bilingual_docx: "二言語 DOCX をダウンロード",
    download_bilingual_ass: "二言語 ASS をダウンロード",
    audio_preview_label: "音声プレビュー",
    subtitle_preview_default: "字幕プレビュー",
    preview_field_speaker: "話者",
    preview_field_start: "開始",
    preview_field_end: "終了",
    preview_field_text: "字幕内容",
    preview_placeholder_speaker: "空欄可",
    preview_placeholder_text: "左側のセグメントを選ぶとここで編集できます",
    preview_edit_hint: "左側のタイムラインセグメントを選ぶと、ここで編集できます。",
    preview_edit_sync: "ここでの変更はプレビューと下のタイムラインに同期されます。",
    editor_title: "字幕編集",
    editor_load_preview: "ローカル動画プレビューを読み込む",
    editor_undo: "元に戻す",
    editor_redo: "やり直し",
    editor_add_segment: "セグメント追加",
    editor_save: "変更を保存",
    editor_saving: "保存中...",
    editor_shortcuts: "キーボード編集に対応。ショートカット: Ctrl/Cmd + S で保存、Ctrl/Cmd + Enter で現在の後ろに追加。",
    qc_fix_format: "書式のみ修正",
    qc_fix_all: "すべて修正",
    qc_scan: "再スキャン",
    draft_auto_saved: "下書きを自動保存しました {time}",
    draft_saving: "下書きを保存中...",
    draft_save_failed: "下書きの保存に失敗しました",
    save_failed: "保存に失敗しました",
    save_saved: "正式字幕を保存し、下書きをクリアしました。",
    save_changes: "変更を保存",
    delete_confirm: "タスク「{name}」とその下書き・履歴・出力ファイルを削除しますか？",
    delete_failed: "削除に失敗しました",
    submit_failed: "送信に失敗しました",
    upload_failed: "アップロード失敗: {name}",
  },
  el: {
    meta_model: "Whisper large-v3",
    meta_offline: "Τοπικά",
    meta_outputs: "Υπότιτλοι + Κείμενο",
    ui_language: "Γλώσσα",
    panel_input_label: "Νέα εργασία",
    panel_input_title: "Νέα μεταγραφή",
    panel_input_subline: "Εισαγωγή μέσου, επιλογή στρατηγικής και άμεση εκτέλεση.",
    panel_badge_local: "Τοπική επεξεργασία",
    stage_import_kicker: "Εισαγωγή",
    stage_import_title: "Εισαγωγή μέσου",
    stage_import_note: "Ήχος και βίντεο μπαίνουν από το ίδιο σημείο.",
    drop_title: "Σύρε ήχο ή βίντεο εδώ",
    drop_subtitle: "Υποστηρίζει MP3 / WAV / M4A / AAC / FLAC / OGG / MP4 / MOV / MKV / WEBM / AVI.",
    file_empty: "Δεν έχει επιλεγεί αρχείο",
    tag_batch: "Μαζική εισαγωγή",
    tag_extract: "Εξαγωγή ήχου",
    tag_offline: "Χωρίς cloud",
    stage_setup_kicker: "Ρυθμίσεις",
    stage_setup_title: "Ρυθμίσεις αναγνώρισης",
    stage_setup_note: "Επίλεξε preset, γλώσσα και μοντέλο.",
    preset_balanced: "Ισορροπημένο",
    preset_speed: "Γρήγορο",
    preset_delivery: "Παράδοση",
    field_language: "Γλώσσα αναγνώρισης",
    field_model: "Μέγεθος μοντέλου",
    model_large_v3: "large-v3 (default)",
    field_outputs: "Έξοδοι",
    outputs_subtitle: "Υπότιτλοι: SRT / VTT / TXT / JSON / ASS",
    outputs_doc: "Κείμενο: Markdown / DOCX",
    stage_delivery_kicker: "Παράδοση",
    stage_delivery_title: "Ενισχυμένη παράδοση",
    stage_delivery_note: "Ρύθμισε δίγλωσσο, ομιλητές, split και στυλ υποτίτλων.",
    field_translate: "Δίγλωσση μετάφραση",
    field_diarization: "Διαχωρισμός ομιλητών",
    field_speakers: "Αριθμός ομιλητών",
    field_split: "Βελτιστοποίηση split",
    field_ass_style: "Στυλ ASS",
    option_off: "Κλειστό",
    option_on_experimental: "Ανοιχτό (πειραματικό)",
    option_on_recommended: "Ανοιχτό (προτείνεται)",
    ass_variety: "Περίγραμμα variety",
    ass_punch: "Punch λέξεων",
    ass_neon: "Neon υπότιτλοι",
    summary_kicker: "Σύνοψη εργασίας",
    submit_start: "Έναρξη μαζικής μεταγραφής",
    submit_busy: "Υποβολή εργασιών μεταγραφής...",
    runtime_label: "Εκτέλεση",
    runtime_title: "Πίνακας εκτέλεσης",
    runtime_subline: "Πρόχειρα, ιστορικό και αρχεία εξόδου αποκαθίστανται μετά από refresh.",
    filter_all: "Όλα",
    filter_draft: "Πρόχειρα",
    filter_running: "Σε εξέλιξη",
    filter_completed: "Ολοκληρωμένα",
    filter_failed: "Απέτυχαν",
    poll_pause: "Παύση polling",
    poll_resume: "Συνέχιση polling",
    preview_label: "Προεπισκόπηση",
    preview_title: "Ζωντανή προεπισκόπηση βίντεο και υποτίτλων",
    quick_edit_label: "Γρήγορη επεξεργασία",
    quick_edit_title: "Επεξεργασία τρέχοντος τμήματος",
    timeline_label: "Timeline editor",
    quality_label: "Ποιοτικός έλεγχος",
    quality_title: "Πίνακας ποιοτικού ελέγχου",
    footer_copy: "© 2026 XM. All rights reserved.",
    preset_custom: "Προσαρμοσμένο",
    enhancement_default: "Βασική παράδοση",
    enhancement_bilingual: "Δίγλωσσο",
    enhancement_speaker: "Ομιλητές",
    enhancement_split: "Split",
    enhancement_ass: "ASS",
    note_action: "Παράγει μεταγραφή με {model}, εξάγει SRT / ASS / κείμενο και συνεχίζει σε timeline επεξεργασία.",
    status_queued: "Σε αναμονή",
    status_running: "Σε επεξεργασία",
    status_completed: "Ολοκληρώθηκε",
    status_failed: "Απέτυχε",
    status_paused: "Σε παύση",
    status_idle: "Αναμονή",
    status_draft: "Πρόχειρο",
    status_processing: "Επεξεργασία",
    empty_jobs_title: "Δεν υπάρχουν εργασίες σε αυτό το φίλτρο",
    empty_jobs_meta: "Άλλαξε φίλτρο ή υπέβαλε νέα εργασία.",
    draft_saved_at: "Πρόχειρο αποθηκεύτηκε {time}",
    created_at: "Δημιουργήθηκε {time}",
    delete_job: "Διαγραφή εργασίας",
    no_auto_fix: "Δεν υπάρχουν προβλήματα για αυτόματη διόρθωση.",
    no_format_fix: "Δεν υπάρχουν προβλήματα μορφοποίησης για αυτόματη διόρθωση.",
    fix_all_done: "Η πλήρης διόρθωση επεξεργάστηκε {count} θέματα.",
    fix_all_done_manual: "Η πλήρης διόρθωση επεξεργάστηκε {count} θέματα, ενώ {manual} χρειάζονται χειροκίνητο έλεγχο.",
    fix_format_done: "Η διόρθωση μορφοποίησης επεξεργάστηκε {count} θέματα.",
    fix_format_done_manual: "Η διόρθωση μορφοποίησης επεξεργάστηκε {count} θέματα, ενώ {manual} χρειάζονται χειροκίνητο έλεγχο.",
    draft_hint: "Τα πρόχειρα αποθηκεύονται αυτόματα τοπικά.",
    runtime_fact_status: "Κατάσταση",
    runtime_fact_language: "Γλώσσα",
    runtime_waiting_submit: "Αναμονή υποβολής",
    runtime_flow_title: "Ροή επεξεργασίας",
    runtime_step_submit_title: "01 Υποβολή εργασίας",
    runtime_step_submit_note: "Εισαγωγή μέσου και έναρξη μεταγραφής",
    runtime_step_recognize_title: "02 Αναγνώριση",
    runtime_step_recognize_note: "Τοπικό Whisper inference και split",
    runtime_step_deliver_title: "03 Παραδοτέα",
    runtime_step_deliver_note: "Εξαγωγή SRT / ASS / κειμένου",
    runtime_step_refine_title: "04 Τελική επεξεργασία",
    runtime_step_refine_note: "Συνέχεια σε timeline και preview",
    runtime_history_title: "Πρόχειρα και ιστορικό",
    pending_outputs_title: "Αναμένονται αρχεία",
    pending_outputs_note: "Μετά την ολοκλήρωση θα μπορείς να κατεβάσεις ZIP και όλα τα αρχεία υποτίτλων.",
    format_srt: "SRT",
    format_ass: "ASS",
    format_txt: "TXT",
    format_docx: "DOCX",
    download_bundle: "Λήψη ZIP",
    download_srt: "Λήψη SRT",
    download_vtt: "Λήψη VTT",
    download_txt: "Λήψη TXT",
    download_json: "Λήψη JSON",
    download_md: "Λήψη Markdown",
    download_docx: "Λήψη DOCX",
    download_ass: "Λήψη ASS",
    download_bilingual_srt: "Λήψη δίγλωσσου SRT",
    download_bilingual_txt: "Λήψη δίγλωσσου TXT",
    download_bilingual_md: "Λήψη δίγλωσσου Markdown",
    download_bilingual_docx: "Λήψη δίγλωσσου DOCX",
    download_bilingual_ass: "Λήψη δίγλωσσου ASS",
    audio_preview_label: "Προεπισκόπηση ήχου",
    subtitle_preview_default: "Προεπισκόπηση υποτίτλων",
    preview_field_speaker: "Ομιλητής",
    preview_field_start: "Έναρξη",
    preview_field_end: "Λήξη",
    preview_field_text: "Κείμενο υποτίτλου",
    preview_placeholder_speaker: "Προαιρετικό",
    preview_placeholder_text: "Επίλεξε τμήμα αριστερά για να το επεξεργαστείς εδώ",
    preview_edit_hint: "Επίλεξε τμήμα στο timeline αριστερά για άμεση επεξεργασία εδώ.",
    preview_edit_sync: "Οι αλλαγές εδώ συγχρονίζονται με το preview και το timeline.",
    editor_title: "Επεξεργασία υποτίτλων",
    editor_load_preview: "Φόρτωση τοπικής προεπισκόπησης βίντεο",
    editor_undo: "Αναίρεση",
    editor_redo: "Επανάληψη",
    editor_add_segment: "Νέο τμήμα",
    editor_save: "Αποθήκευση αλλαγών",
    editor_saving: "Αποθήκευση...",
    editor_shortcuts: "Υποστηρίζεται επεξεργασία με πληκτρολόγιο. Συντομεύσεις: Ctrl/Cmd + S για αποθήκευση, Ctrl/Cmd + Enter για νέο τμήμα μετά το τρέχον.",
    qc_fix_format: "Μόνο μορφοποίηση",
    qc_fix_all: "Διόρθωση όλων",
    qc_scan: "Νέα σάρωση",
    draft_auto_saved: "Το πρόχειρο αποθηκεύτηκε αυτόματα {time}",
    draft_saving: "Αποθήκευση πρόχειρου...",
    draft_save_failed: "Αποτυχία αποθήκευσης πρόχειρου",
    save_failed: "Αποτυχία αποθήκευσης",
    save_saved: "Οι τελικοί υπότιτλοι αποθηκεύτηκαν και το πρόχειρο καθαρίστηκε.",
    save_changes: "Αποθήκευση αλλαγών",
    delete_confirm: "Να διαγραφεί η εργασία “{name}” μαζί με πρόχειρο, ιστορικό και εξαγόμενα αρχεία;",
    delete_failed: "Αποτυχία διαγραφής",
    submit_failed: "Αποτυχία υποβολής",
    upload_failed: "Αποτυχία μεταφόρτωσης: {name}",
  },
};
const PRESET_CONFIGS = {
  speed: {
    language: "auto",
    modelSize: "small",
    translateTo: "none",
    diarization: "off",
    speakerCount: "2",
    smartSplit: "off",
    assStyle: "variety",
  },
  balanced: {
    language: "auto",
    modelSize: "large-v3",
    translateTo: "none",
    diarization: "off",
    speakerCount: "2",
    smartSplit: "on",
    assStyle: "variety",
  },
  delivery: {
    language: "auto",
    modelSize: "large-v3",
    translateTo: "en",
    diarization: "on",
    speakerCount: "2",
    smartSplit: "on",
    assStyle: "punch",
  },
};

const QC_LIMITS = {
  shortDuration: 0.8,
  longDuration: 7,
  maxLineLength: 26,
  maxCompactToken: 18,
};

function t(key, params = {}) {
  const table = I18N[currentLocale] || I18N["zh-CN"];
  const fallback = I18N["zh-CN"];
  const template = table[key] || fallback[key] || key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function getLanguageLabel(option, locale = currentLocale) {
  if (option.labels?.[locale]) {
    return option.labels[locale];
  }
  return option.native || option.value;
}

function languageOption(value) {
  return LANGUAGE_OPTIONS.find((option) => option.value === value);
}

function renderUiLocaleOptions() {
  uiLocale.innerHTML = UI_LOCALES.map((locale) => (
    `<option value="${locale.value}">${locale.label}</option>`
  )).join("");
  uiLocale.value = currentLocale;
}

function renderRecognitionLanguageOptions() {
  const selected = language.value || "auto";
  language.innerHTML = LANGUAGE_OPTIONS.map((option) => (
    `<option value="${option.value}">${getLanguageLabel(option)}</option>`
  )).join("");
  language.value = selected;
}

function renderTranslateOptions() {
  const selected = translateTo.value || "none";
  const candidates = LANGUAGE_OPTIONS.filter((option) => option.value !== "auto");
  const offLabel = t("option_off");
  translateTo.innerHTML = [
    `<option value="none">${offLabel}</option>`,
    ...candidates.map((option) => `<option value="${option.value}">${getLanguageLabel(option)}</option>`),
  ].join("");
  translateTo.value = selected;
}

function applyI18n() {
  document.documentElement.lang = currentLocale;
  document.documentElement.dataset.localeDensity = currentLocale === "zh-CN" ? "normal" : "compact";
  document.title = `XM Subtitle Studio`;
  i18nNodes.forEach((node) => {
    const key = node.dataset.i18n;
    if (key) {
      node.textContent = t(key);
    }
  });
  i18nPlaceholderNodes.forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (key) {
      node.setAttribute("placeholder", t(key));
    }
  });
  renderUiLocaleOptions();
  renderRecognitionLanguageOptions();
  renderTranslateOptions();
  setBusy(submitButton.disabled);
  pollToggleButton.textContent = pollPaused ? t("poll_resume") : t("poll_pause");
  if (!activeJobId) {
    jobStatusText.textContent = t("runtime_title");
  }
  if (!activeFiles.length) {
    fileName.textContent = t("file_empty");
  }
}

function initializePreferences() {
  const storedLocale = localStorage.getItem("xm-ui-locale");
  const browserLocale = navigator.language
    ? Object.keys(I18N).find((key) => navigator.language === key || navigator.language.startsWith(`${key}-`))
    : null;
  currentLocale = storedLocale && I18N[storedLocale] ? storedLocale : (browserLocale || "zh-CN");
  applyI18n();
}

function cloneSegments(segments) {
  return JSON.parse(JSON.stringify(segments || []));
}

function isDraftJob(job) {
  return Boolean(job?.has_draft) || job?.status === "queued" || job?.status === "running";
}

function editorSegmentsForJob(job) {
  if (job?.has_draft && Array.isArray(job.draft_segments) && job.draft_segments.length) {
    return job.draft_segments;
  }
  return job?.segments || [];
}

function formatDraftTimestamp(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(currentLocale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setDraftState(message) {
  editorDraftState.textContent = message || t("draft_hint");
}

function ensureEditorState(jobId, segments) {
  if (!editorStateByJob.has(jobId)) {
    editorStateByJob.set(jobId, {
      history: [cloneSegments(segments)],
      index: 0,
    });
  }
  return editorStateByJob.get(jobId);
}

function setFiles(files) {
  activeFiles = Array.from(files || []);
  if (!activeFiles.length) {
    fileName.textContent = t("file_empty");
    return;
  }

  if (activeFiles.length === 1) {
    const [file] = activeFiles;
    fileName.textContent = `${file.name} / ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    return;
  }

  const preview = activeFiles.slice(0, 3).map((file) => file.name).join(" / ");
  const suffix = activeFiles.length > 3 ? ` ... 共 ${activeFiles.length} 个文件` : "";
  fileName.textContent = `${preview}${suffix}`;
}

function setJobVisible(visible) {
  jobCard.classList.toggle("hidden", !visible);
}

function syncRuntimeEmptyState() {
  const hasJobs = jobs.size > 0;
  runtimeGuide.classList.toggle("hidden", hasJobs);
  jobPill.classList.toggle("hidden", !hasJobs);
  if (!hasJobs) {
    updateRuntimeSteps("idle");
    jobPill.dataset.status = "idle";
    jobPill.textContent = statusLabel("idle");
    pendingOutputGroup.classList.remove("hidden");
    downloadGroup.classList.add("hidden");
  }
}

function updateRuntimeSteps(status) {
  const completed = new Set();
  let active = "submit";
  let failed = null;

  if (status === "queued") {
    completed.add("submit");
    active = "recognize";
  } else if (status === "running") {
    completed.add("submit");
    active = "recognize";
  } else if (status === "completed") {
    completed.add("submit");
    completed.add("recognize");
    completed.add("deliver");
    active = "refine";
  } else if (status === "failed") {
    completed.add("submit");
    failed = "recognize";
    active = "recognize";
  }

  runtimeSteps.forEach((step) => {
    const stepName = step.dataset.step;
    step.classList.toggle("is-active", stepName === active);
    step.classList.toggle("is-done", completed.has(stepName));
    step.classList.toggle("is-failed", stepName === failed);
  });
}

function setEditorVisible(visible) {
  editorCard.classList.toggle("hidden", !visible);
}

function setPreviewVisible(visible) {
  previewGrid.classList.toggle("hidden", !visible);
}

function currentMediaElement() {
  return activePreviewMode === "audio" ? audioPlayer : videoPreview;
}

function clearVideoPreviewSource() {
  videoPreview.pause();
  videoPreview.removeAttribute("src");
  videoPreview.load();
}

function clearAudioPreviewSource() {
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
}

function setPreviewMode(mode) {
  activePreviewMode = mode;
  const isVideo = mode === "video";
  const isAudio = mode === "audio";
  videoStage.classList.toggle("audio-mode", mode === "audio");
  videoPreview.classList.toggle("hidden", !isVideo);
  audioPreview.classList.toggle("hidden", !isAudio);
  audioPlayerWrap.classList.toggle("hidden", !isAudio);
  videoPreview.toggleAttribute("controls", isVideo);
}

function syncMediaPreviewForJob(job) {
  if (!job) {
    activePreviewJobId = null;
    activePlaybackRange = null;
    setPreviewMode("none");
    clearVideoPreviewSource();
    clearAudioPreviewSource();
    setPreviewVisible(false);
    return;
  }

  setPreviewVisible(true);

  if (job.is_video && job.media_preview_url && job.status === "completed") {
    if (activeVideoUrl) {
      URL.revokeObjectURL(activeVideoUrl);
      activeVideoUrl = null;
    }
    clearAudioPreviewSource();
    if (activePreviewJobId !== job.job_id || !videoPreview.src.includes(job.media_preview_url)) {
      activePreviewJobId = job.job_id;
      videoPreview.src = `${job.media_preview_url}?t=${encodeURIComponent(job.created_at || job.job_id)}`;
    }
    setPreviewMode("video");
    return;
  }

  activePreviewJobId = job.job_id;
  activePlaybackRange = null;
  clearVideoPreviewSource();
  if (job.media_preview_url) {
    audioPlayer.src = `${job.media_preview_url}?t=${encodeURIComponent(job.created_at || job.job_id)}`;
  } else {
    clearAudioPreviewSource();
  }
  setPreviewMode("audio");
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? t("submit_busy") : t("submit_start");
}

function currentPresetState() {
  return {
    language: language.value,
    modelSize: modelSize.value,
    translateTo: translateTo.value,
    diarization: diarization.value,
    speakerCount: speakerCount.value,
    smartSplit: smartSplit.value,
    assStyle: assStyle.value,
  };
}

function matchesPreset(state, preset) {
  return Object.entries(preset).every(([key, value]) => state[key] === value);
}

function detectPresetName(state) {
  if (matchesPreset(state, PRESET_CONFIGS.speed)) {
    return "speed";
  }
  if (matchesPreset(state, PRESET_CONFIGS.delivery)) {
    return "delivery";
  }
  if (matchesPreset(state, PRESET_CONFIGS.balanced)) {
    return "balanced";
  }
  return "custom";
}

function presetLabel(name) {
  const labels = {
    speed: t("preset_speed"),
    balanced: t("preset_balanced"),
    delivery: t("preset_delivery"),
    custom: t("preset_custom"),
  };
  return labels[name] || t("preset_custom");
}

function languageLabel(value) {
  const option = languageOption(value);
  return option ? getLanguageLabel(option) : value;
}

function statusLabel(status) {
  const labels = {
    queued: t("status_queued"),
    running: t("status_running"),
    completed: t("status_completed"),
    failed: t("status_failed"),
    paused: t("status_paused"),
    idle: t("status_idle"),
    draft: t("status_draft"),
  };
  return labels[status] || status || t("status_idle");
}

function buildEnhancementSummary(state) {
  const flags = [];
  if (state.translateTo !== "none") {
    flags.push(`${t("enhancement_bilingual")} ${languageLabel(state.translateTo)}`);
  }
  if (state.diarization === "on") {
    flags.push(`${t("enhancement_speaker")} ${state.speakerCount}`);
  }
  if (state.smartSplit === "on") {
    flags.push(t("enhancement_split"));
  }
  if (state.assStyle !== "variety") {
    flags.push(`${t("enhancement_ass")} ${assStyle.selectedOptions[0]?.textContent || state.assStyle}`);
  }
  return flags.length ? flags.join(" / ") : t("enhancement_default");
}

function updateTaskSummary() {
  const state = currentPresetState();
  const presetName = detectPresetName(state);
  const enhancementText = buildEnhancementSummary(state);

  summaryPreset.textContent = presetLabel(presetName);
  summaryLanguage.textContent = languageLabel(state.language);
  summaryModel.textContent = state.modelSize;
  summaryEnhancement.textContent = enhancementText;
  summaryEnhancement.classList.toggle("summary-chip-muted", enhancementText === t("enhancement_default"));
  actionNote.textContent = t("note_action", { model: state.modelSize });
}

function syncPresetHighlight() {
  const state = currentPresetState();
  const activePreset = detectPresetName(state);

  presetChips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.preset === activePreset);
  });
  updateTaskSummary();
}

function applyPreset(name) {
  const preset = PRESET_CONFIGS[name];
  if (!preset) {
    return;
  }
  language.value = preset.language;
  modelSize.value = preset.modelSize;
  translateTo.value = preset.translateTo;
  diarization.value = preset.diarization;
  speakerCount.value = preset.speakerCount;
  smartSplit.value = preset.smartSplit;
  assStyle.value = preset.assStyle;
  syncPresetHighlight();
  updatePreviewVisual();
}

function setPollPaused(paused) {
  pollPaused = paused;
  pollToggleButton.textContent = paused ? t("poll_resume") : t("poll_pause");
  if (!paused && jobs.size) {
    pollJobs();
  }
}

function formatEditorTime(seconds) {
  const total = Number(seconds || 0);
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = (total % 60).toFixed(3).padStart(6, "0");
  return `${hours}:${minutes}:${secs}`;
}

function parseEditorTime(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return 0;
  }
  const parts = raw.split(":");
  if (parts.length !== 3) {
    return Number(raw) || 0;
  }
  const [hours, minutes, seconds] = parts.map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function buildEmptySegment(baseSegment = null) {
  const start = baseSegment ? Number(baseSegment.end || 0) : 0;
  return {
    speaker: baseSegment?.speaker || "",
    start,
    end: start + 2,
    text: "",
  };
}

function currentEditorState() {
  return editorStateByJob.get(activeJobId);
}

function currentSegments() {
  const state = currentEditorState();
  return state ? cloneSegments(state.history[state.index]) : [];
}

function pushHistory(segments) {
  const state = ensureEditorState(activeJobId, segments);
  state.history = state.history.slice(0, state.index + 1);
  state.history.push(cloneSegments(segments));
  state.index = state.history.length - 1;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const state = currentEditorState();
  if (!state) {
    undoButton.disabled = true;
    redoButton.disabled = true;
    return;
  }
  undoButton.disabled = state.index === 0;
  redoButton.disabled = state.index >= state.history.length - 1;
}

function applyHistory(direction) {
  const state = currentEditorState();
  if (!state) {
    return;
  }
  const nextIndex = state.index + direction;
  if (nextIndex < 0 || nextIndex >= state.history.length) {
    return;
  }
  state.index = nextIndex;
  renderEditorFromState();
}

function updateSummary(job) {
  jobStatusText.textContent = statusLabel(job.status) || t("status_processing");
  jobPill.classList.remove("hidden");
  jobPill.textContent = statusLabel(pollPaused ? "paused" : (job.status || "running"));
  jobPill.dataset.status = pollPaused ? "paused" : (job.status || "idle");
  jobMessage.textContent = job.error || job.message || "";
  jobLanguage.textContent = job.detected_language || job.language || "-";
  progressBar.style.width = `${Math.max(2, Math.round((job.progress || 0) * 100))}%`;
  updateRuntimeSteps(job.status || "idle");
}

function getFilteredJobs() {
  const entries = Array.from(jobs.values()).sort((a, b) => {
    if (isDraftJob(a) !== isDraftJob(b)) {
      return isDraftJob(a) ? -1 : 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
  const filter = jobFilter.value;
  if (filter === "all") {
    return entries;
  }
  if (filter === "draft") {
    return entries.filter((job) => isDraftJob(job));
  }
  if (filter === "running") {
    return entries.filter((job) => job.status === "queued" || job.status === "running");
  }
  return entries.filter((job) => job.status === filter);
}

function renderJobList() {
  const entries = getFilteredJobs();
  jobList.innerHTML = "";
  syncRuntimeEmptyState();

  if (!entries.length) {
    jobList.innerHTML = `<div class="job-item"><p class="job-item-name">${t("empty_jobs_title")}</p><p class="job-item-meta">${t("empty_jobs_meta")}</p></div>`;
    return;
  }

  entries.forEach((job) => {
    const entry = document.createElement("div");
    entry.className = "job-entry";
    entry.innerHTML = `
      <button type="button" class="job-item${job.job_id === activeJobId ? " is-active" : ""}" data-job-id="${job.job_id}">
        <div class="job-item-top">
          <p class="job-item-name">${job.original_name}</p>
          <div class="job-item-badges">
            ${isDraftJob(job) ? `<span class="status-pill" data-status="queued">${statusLabel("draft")}</span>` : ""}
            <span class="status-pill" data-status="${job.status}">${statusLabel(job.status)}</span>
          </div>
        </div>
        <p class="job-item-meta">${job.message || ""}</p>
        <p class="job-item-meta">${job.has_draft ? t("draft_saved_at", { time: formatDraftTimestamp(job.draft_updated_at) }) : t("created_at", { time: formatDraftTimestamp(job.created_at) })}</p>
      </button>
      <button type="button" class="job-delete-button" data-delete-job="${job.job_id}" aria-label="${t("delete_job")}">${t("delete_job")}</button>
    `;
    entry.querySelector("[data-job-id]")?.addEventListener("click", () => {
      activeJobId = job.job_id;
      renderActiveJob();
    });
    entry.querySelector("[data-delete-job]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteJob(job.job_id);
    });
    jobList.appendChild(entry);
  });
}

function setDownloadLinks(job) {
  const urls = job.download_urls || {};
  downloadBundleLink.href = `/api/jobs/${job.job_id}/download-all`;
  downloadSrtLink.href = urls.srt || "#";
  downloadVttLink.href = urls.vtt || "#";
  downloadTxtLink.href = urls.txt || "#";
  downloadJsonLink.href = urls.json || "#";
  downloadMdLink.href = urls.md || "#";
  downloadDocxLink.href = urls.docx || "#";
  downloadAssLink.href = urls.ass || "#";
  downloadBilingualSrtLink.href = urls.srt_bilingual || "#";
  downloadBilingualTxtLink.href = urls.txt_bilingual || "#";
  downloadBilingualMdLink.href = urls.md_bilingual || "#";
  downloadBilingualDocxLink.href = urls.docx_bilingual || "#";
  downloadBilingualAssLink.href = urls.ass_bilingual || "#";
  downloadBilingualSrtLink.classList.toggle("hidden", !urls.srt_bilingual);
  downloadBilingualTxtLink.classList.toggle("hidden", !urls.txt_bilingual);
  downloadBilingualMdLink.classList.toggle("hidden", !urls.md_bilingual);
  downloadBilingualDocxLink.classList.toggle("hidden", !urls.docx_bilingual);
  downloadBilingualAssLink.classList.toggle("hidden", !urls.ass_bilingual);
  const hasDownloads = Boolean(urls.srt);
  pendingOutputGroup.classList.toggle("hidden", hasDownloads);
  downloadGroup.classList.toggle("hidden", !hasDownloads);
}

function previewTextForSegment(segment) {
  if (!segment) {
    return t("subtitle_preview_default");
  }
  const speaker = segment.speaker ? `[${segment.speaker}] ` : "";
  return `${speaker}${segment.text}`;
}

function extractSuspiciousTokens(text) {
  const tokens = String(text || "")
    .split(/[\s,.;:!?，。！？；：、“”"'`()[\]{}<>/\\|-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.filter((token) => {
    if (token.includes("�")) {
      return true;
    }
    if (/(.)\1{3,}/u.test(token)) {
      return true;
    }
    if (token.length > QC_LIMITS.maxCompactToken) {
      return true;
    }
    const hasLatin = /[A-Za-z]/.test(token);
    const hasCjk = /[\u3400-\u9FFF]/.test(token);
    const hasGreek = /[\u0370-\u03FF]/.test(token);
    return Number(hasLatin) + Number(hasCjk) + Number(hasGreek) >= 2;
  });
}

function splitSubtitleText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const punctuationMatch = normalized.match(/^(.{8,}?[\.,，。！？!?；;:：])\s+(.+)$/u);
  if (punctuationMatch) {
    return [punctuationMatch[1].trim(), punctuationMatch[2].trim()];
  }
  const midpoint = Math.floor(normalized.length / 2);
  const splitAt = normalized.indexOf(" ", midpoint);
  if (splitAt > 0) {
    return [normalized.slice(0, splitAt).trim(), normalized.slice(splitAt + 1).trim()];
  }
  return [normalized];
}

function scanQualityIssues(segments) {
  const issues = [];

  segments.forEach((segment, index) => {
    const text = String(segment.text || "").trim();
    const duration = Math.max(0, Number(segment.end || 0) - Number(segment.start || 0));
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);

    if (!text) {
      issues.push({ index, severity: "error", type: "空字幕", detail: "当前字幕内容为空。" });
    }
    if (text && duration < QC_LIMITS.shortDuration) {
      issues.push({ index, severity: "warn", type: "时长过短", detail: `仅 ${duration.toFixed(2)}s，建议至少 ${QC_LIMITS.shortDuration}s。` });
    }
    if (duration > QC_LIMITS.longDuration) {
      issues.push({ index, severity: "warn", type: "时长过长", detail: `达到 ${duration.toFixed(2)}s，建议拆分。` });
    }
    if (longestLine > QC_LIMITS.maxLineLength) {
      issues.push({ index, severity: "warn", type: "行长超限", detail: `最长 ${longestLine} 字，建议控制在 ${QC_LIMITS.maxLineLength} 字内。` });
    }
    const suspiciousTokens = extractSuspiciousTokens(text);
    if (suspiciousTokens.length) {
      issues.push({
        index,
        severity: "warn",
        type: "可疑错词",
        detail: `请检查：${suspiciousTokens.slice(0, 3).join(" / ")}`,
      });
    }
    if (index > 0) {
      const previous = segments[index - 1];
      if (Number(segment.start || 0) < Number(previous.end || 0) - 0.01) {
        issues.push({
          index,
          severity: "error",
          type: "时间重叠",
          detail: `与上一段重叠 ${(Number(previous.end) - Number(segment.start)).toFixed(2)}s。`,
        });
      }
    }
  });

  return issues;
}

function renderQualityPanel(segments) {
  const issues = scanQualityIssues(segments);
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warns = issues.length - errors;

  qcSummary.innerHTML = issues.length
    ? `
      <span class="qc-chip qc-chip-error">${errors} 个严重问题</span>
      <span class="qc-chip qc-chip-warn">${warns} 个建议修正</span>
      <span class="qc-chip">共 ${segments.length} 段</span>
    `
    : `
      <span class="qc-chip qc-chip-pass">质检通过</span>
      <span class="qc-chip">共 ${segments.length} 段</span>
    `;

  qcList.innerHTML = "";
  if (!issues.length) {
    qcList.innerHTML = '<div class="qc-empty">当前字幕未发现明显交付风险。</div>';
    return;
  }

  issues.forEach((issue) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `qc-item qc-item-${issue.severity}`;
    item.innerHTML = `
      <span class="qc-item-index">#${issue.index + 1}</span>
      <div class="qc-item-copy">
        <strong>${issue.type}</strong>
        <span>${issue.detail}</span>
      </div>
    `;
    item.addEventListener("click", () => {
      activePreviewIndex = issue.index;
      const row = editorList.querySelector(`.editor-row[data-index="${issue.index}"]`);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        playSegment(issue.index, false);
        row.querySelector('[data-field="text"]')?.focus();
      }
    });
    qcList.appendChild(item);
  });
}

function fixShortDuration(segments, index) {
  const segment = segments[index];
  const next = segments[index + 1];
  const previous = segments[index - 1];
  let start = Number(segment.start || 0);
  let end = Number(segment.end || 0);
  const minDuration = QC_LIMITS.shortDuration;

  if (next) {
    end = Math.min(next.start - 0.02, Math.max(end, start + minDuration));
  } else {
    end = Math.max(end, start + minDuration);
  }
  if (end - start < minDuration && previous) {
    start = Math.max(previous.end + 0.02, end - minDuration);
  }
  segment.start = Math.max(0, Number(start.toFixed(3)));
  segment.end = Math.max(segment.start + 0.2, Number(end.toFixed(3)));
}

function fixOverlap(segments, index) {
  const previous = segments[index - 1];
  const segment = segments[index];
  if (!previous || !segment) {
    return;
  }
  segment.start = Number((previous.end + 0.02).toFixed(3));
  if (segment.end <= segment.start) {
    segment.end = Number((segment.start + 0.4).toFixed(3));
  }
}

function fixEmptyText(segment) {
  segment.text = "…";
}

function fixLineLength(segment) {
  const parts = splitSubtitleText(segment.text);
  if (parts.length >= 2) {
    segment.text = parts.slice(0, 2).join("\n");
  }
}

function fixLongDuration(segments, index) {
  const segment = segments[index];
  const parts = splitSubtitleText(segment.text);
  if (parts.length < 2) {
    return false;
  }
  const duration = Math.max(0.4, Number(segment.end || 0) - Number(segment.start || 0));
  const midpoint = Number((segment.start + duration / 2).toFixed(3));
  const first = { ...segment, text: parts[0], end: midpoint };
  const second = { ...segment, text: parts[1], start: midpoint + 0.02 };
  segments.splice(index, 1, first, second);
  return true;
}

function applyQualityFixes(mode = "all") {
  const originalSegments = currentSegments();
  if (!originalSegments.length) {
    return;
  }

  const segments = cloneSegments(originalSegments);
  let fixedCount = 0;
  let manualCount = 0;
  const includeContentFixes = mode === "all";

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const text = String(segment.text || "").trim();
    const duration = Math.max(0, Number(segment.end || 0) - Number(segment.start || 0));
    const longestLine = text.split("\n").reduce((max, line) => Math.max(max, line.trim().length), 0);

    if (!text && includeContentFixes) {
      fixEmptyText(segment);
      fixedCount += 1;
    }
    if (index > 0 && Number(segment.start || 0) < Number(segments[index - 1].end || 0) - 0.01) {
      fixOverlap(segments, index);
      fixedCount += 1;
    }
    if (duration < QC_LIMITS.shortDuration) {
      fixShortDuration(segments, index);
      fixedCount += 1;
    }
    if (longestLine > QC_LIMITS.maxLineLength) {
      fixLineLength(segment);
      fixedCount += 1;
    }
    if ((Number(segment.end || 0) - Number(segment.start || 0)) > QC_LIMITS.longDuration) {
      if (fixLongDuration(segments, index)) {
        fixedCount += 1;
        index -= 1;
      }
    }
    if (extractSuspiciousTokens(segment.text).length) {
      manualCount += 1;
    }
  }

  if (!fixedCount) {
    setDraftState(includeContentFixes ? t("no_auto_fix") : t("no_format_fix"));
    renderQualityPanel(currentSegments());
    return;
  }

  pushHistory(segments);
  renderEditorFromState();
  setDraftState(
    manualCount
      ? t(includeContentFixes ? "fix_all_done_manual" : "fix_format_done_manual", { count: fixedCount, manual: manualCount })
      : t(includeContentFixes ? "fix_all_done" : "fix_format_done", { count: fixedCount }),
  );
  scheduleDraftSave();
}

function updatePreviewVisual(segment = null) {
  const style = assStyle.value;
  subtitleOverlay.className = `subtitle-overlay ${style}`;
  const text = previewTextForSegment(segment);
  subtitleOverlay.textContent = text;
}

function syncPreviewEditor(segment = null) {
  if (!segment) {
    previewSpeaker.value = "";
    previewStart.value = "";
    previewEnd.value = "";
    previewText.value = "";
    previewEditNote.textContent = t("preview_edit_hint");
    return;
  }
  previewSpeaker.value = segment.speaker || "";
  previewStart.value = formatEditorTime(segment.start);
  previewEnd.value = formatEditorTime(segment.end);
  previewText.value = segment.text || "";
  previewEditNote.textContent = t("preview_edit_sync");
}

function findSegmentByTime(segments, time) {
  return segments.findIndex((segment) => time >= segment.start && time <= segment.end);
}

function buildEditorRow(segment, index) {
  const row = document.createElement("div");
  row.className = "editor-row";
  if (!segment.speaker) {
    row.classList.add("is-compact");
  }
  row.dataset.index = String(index);
  row.innerHTML = `
    <input type="text" data-field="speaker" data-index="${index}" value="${segment.speaker || ""}" />
    <input type="text" data-field="start" data-index="${index}" value="${formatEditorTime(segment.start)}" />
    <input type="text" data-field="end" data-index="${index}" value="${formatEditorTime(segment.end)}" />
    <textarea data-field="text" data-index="${index}">${segment.text || ""}</textarea>
    <div class="row-actions">
      <button type="button" data-action="add-below">新增下方</button>
      <button type="button" data-action="split">拆分当前</button>
      <button type="button" data-action="merge-next">合并下段</button>
      <button type="button" data-action="delete">删除本段</button>
    </div>
  `;
  return row;
}

function renderEditorFromState() {
  const segments = currentSegments();
  editorList.innerHTML = "";
  segments.forEach((segment, index) => editorList.appendChild(buildEditorRow(segment, index)));
  renderQualityPanel(segments);
  updateUndoRedoButtons();
  if (activePreviewIndex >= segments.length) {
    activePreviewIndex = Math.max(0, segments.length - 1);
  }
  const activeSegment = segments[activePreviewIndex] || segments[0] || null;
  updatePreviewVisual(activeSegment);
  syncPreviewEditor(activeSegment);
}

function collectSegmentsFromEditor() {
  return Array.from(editorList.querySelectorAll(".editor-row")).map((row) => ({
    speaker: row.querySelector('[data-field="speaker"]').value.trim(),
    start: parseEditorTime(row.querySelector('[data-field="start"]').value),
    end: parseEditorTime(row.querySelector('[data-field="end"]').value),
    text: row.querySelector('[data-field="text"]').value.trim(),
  }));
}

function commitEditorSnapshot() {
  if (!activeJobId) {
    return;
  }
  const segments = collectSegmentsFromEditor();
  pushHistory(segments);
}

function scheduleHistorySnapshot() {
  clearTimeout(historyDebounce);
  historyDebounce = setTimeout(() => {
    commitEditorSnapshot();
  }, 350);
}

function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  setDraftState(t("draft_saving"));
  draftSaveTimer = setTimeout(() => {
    saveEditorDraft();
  }, 900);
}

function insertSegmentAfter(row, segment = null) {
  const segments = currentSegments();
  const index = row ? Number(row.dataset.index) : segments.length - 1;
  const base = row ? segments[index] : segments[segments.length - 1] || null;
  segments.splice(index + 1, 0, segment || buildEmptySegment(base));
  pushHistory(segments);
  renderEditorFromState();
}

function splitRow(row) {
  const segments = currentSegments();
  const index = Number(row.dataset.index);
  const original = segments[index];
  const textarea = row.querySelector('[data-field="text"]');
  const cursor = textarea.selectionStart || Math.floor(original.text.length / 2);
  const left = original.text.slice(0, cursor).trim();
  const right = original.text.slice(cursor).trim();
  if (!left || !right) {
    return;
  }
  const midpoint = original.start + Math.max(0.2, (original.end - original.start) / 2);
  segments[index] = { ...original, text: left, end: midpoint };
  segments.splice(index + 1, 0, { ...original, start: midpoint, text: right });
  pushHistory(segments);
  renderEditorFromState();
}

function mergeWithNext(row) {
  const segments = currentSegments();
  const index = Number(row.dataset.index);
  if (index >= segments.length - 1) {
    return;
  }
  const current = segments[index];
  const next = segments[index + 1];
  segments[index] = {
    ...current,
    end: next.end,
    text: `${current.text.trim()} ${next.text.trim()}`.trim(),
  };
  segments.splice(index + 1, 1);
  pushHistory(segments);
  renderEditorFromState();
}

function deleteRow(row) {
  const segments = currentSegments();
  if (segments.length <= 1) {
    segments[0].text = "";
    pushHistory(segments);
    renderEditorFromState();
    return;
  }
  segments.splice(Number(row.dataset.index), 1);
  pushHistory(segments);
  renderEditorFromState();
}

function playSegment(index, loop = false) {
  const segments = currentSegments();
  const segment = segments[index];
  if (!segment) {
    return;
  }
  activePreviewIndex = index;
  const mediaElement = currentMediaElement();
  if (activePreviewMode === "video" || activePreviewMode === "audio") {
    activePlaybackRange = {
      start: Math.max(0, Number(segment.start || 0)),
      end: Math.max(0, Number(segment.end || 0)),
      loop,
    };
    mediaElement.currentTime = Math.max(0, segment.start);
    mediaElement.play().catch(() => {});
  }
  updatePreviewVisual(segment);
  syncPreviewEditor(segment);
}

function updateActiveRowByTime() {
  if (activePreviewMode !== "video" && activePreviewMode !== "audio") {
    return;
  }
  const mediaElement = currentMediaElement();
  const segments = currentSegments();
  if (!segments.length) {
    return;
  }
  if (activePlaybackRange && mediaElement.currentTime >= activePlaybackRange.end) {
    if (activePlaybackRange.loop) {
      mediaElement.currentTime = activePlaybackRange.start;
      mediaElement.play().catch(() => {});
    } else {
      mediaElement.pause();
      mediaElement.currentTime = activePlaybackRange.end;
      activePlaybackRange = null;
    }
  }
  const index = findSegmentByTime(segments, mediaElement.currentTime);
  editorList.querySelectorAll(".editor-row").forEach((row) => {
    row.classList.toggle("is-live", Number(row.dataset.index) === index);
  });
  if (index >= 0) {
    activePreviewIndex = index;
    updatePreviewVisual(segments[index]);
    syncPreviewEditor(segments[index]);
  }
}

function renderEditor(job) {
  const editorSegments = editorSegmentsForJob(job);
  if (!Array.isArray(editorSegments) || !editorSegments.length) {
    setEditorVisible(false);
    return;
  }

  setEditorVisible(true);
  editorTitle.textContent = job.original_name;
  ensureEditorState(job.job_id, editorSegments);
  if (jobs.get(job.job_id)?.segments) {
    const state = currentEditorState();
    if (state && state.history.length === 1 && state.index === 0) {
      state.history[0] = cloneSegments(editorSegments);
    }
  }
  setDraftState(
    job.has_draft
      ? t("draft_auto_saved", { time: formatDraftTimestamp(job.draft_updated_at) })
      : t("draft_hint")
  );
  renderEditorFromState();
}

function renderActiveJob() {
  const job = jobs.get(activeJobId);
  if (!job) {
    setEditorVisible(false);
    syncMediaPreviewForJob(null);
    setDraftState("");
    syncRuntimeEmptyState();
    renderJobList();
    return;
  }
  setJobVisible(true);
  updateSummary(job);
  renderJobList();
  setDownloadLinks(job);
  renderEditor(job);
  syncMediaPreviewForJob(job);
}

async function refreshJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}`);
  if (response.status === 404) {
    jobs.delete(jobId);
    if (activeJobId === jobId) {
      activeJobId = Array.from(jobs.keys())[0] || null;
    }
    renderActiveJob();
    return null;
  }
  const job = await response.json();
  const existingState = editorStateByJob.get(job.job_id);
  jobs.set(job.job_id, job);
  if (!existingState) {
    ensureEditorState(job.job_id, editorSegmentsForJob(job));
  }
  if (!activeJobId) {
    activeJobId = job.job_id;
  }
  renderActiveJob();
  return job;
}

async function pollJobs() {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
  if (pollPaused) {
    return;
  }

  const trackedJobs = Array.from(jobs.keys());
  if (!trackedJobs.length) {
    return;
  }

  const refreshed = await Promise.all(trackedJobs.map((jobId) => refreshJob(jobId)));
  const hasRunningJobs = refreshed.some((job) => job && (job.status === "queued" || job.status === "running"));
  if (hasRunningJobs) {
    pollTimer = setTimeout(pollJobs, 1400);
  } else {
    setBusy(false);
  }
}

async function saveEditorDraft() {
  const activeJob = jobs.get(activeJobId);
  if (!activeJob) {
    return;
  }
  const segments = collectSegmentsFromEditor();
  if (!segments.length) {
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${activeJobId}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments }),
    });
    const updatedJob = await response.json();
    if (!response.ok) {
      throw new Error(updatedJob.detail || t("draft_save_failed"));
    }
    jobs.set(updatedJob.job_id, updatedJob);
    setDraftState(t("draft_auto_saved", { time: formatDraftTimestamp(updatedJob.draft_updated_at) }));
    renderJobList();
  } catch (error) {
    setDraftState(error.message || t("draft_save_failed"));
  }
}

async function saveEditorChanges() {
  const activeJob = jobs.get(activeJobId);
  if (!activeJob) {
    return;
  }

  clearTimeout(draftSaveTimer);
  const segments = collectSegmentsFromEditor();
  saveEditorButton.disabled = true;
  saveEditorButton.textContent = t("editor_saving");

  try {
    const response = await fetch(`/api/jobs/${activeJobId}/segments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments }),
    });

    const updatedJob = await response.json();
    if (!response.ok) {
      throw new Error(updatedJob.detail || t("save_failed"));
    }

    jobs.set(updatedJob.job_id, updatedJob);
    editorStateByJob.set(updatedJob.job_id, {
      history: [cloneSegments(updatedJob.segments)],
      index: 0,
    });
    setDraftState(t("save_saved"));
    renderActiveJob();
  } catch (error) {
    alert(error.message || t("save_failed"));
  } finally {
    saveEditorButton.disabled = false;
    saveEditorButton.textContent = t("save_changes");
  }
}

async function deleteJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }
  const confirmed = window.confirm(t("delete_confirm", { name: job.original_name }));
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || t("delete_failed"));
    }
    jobs.delete(jobId);
    editorStateByJob.delete(jobId);
    if (activePreviewJobId === jobId) {
      clearVideoPreviewSource();
      clearAudioPreviewSource();
      activePreviewJobId = null;
      activePlaybackRange = null;
    }
    if (activeJobId === jobId) {
      activeJobId = Array.from(jobs.keys())[0] || null;
    }
    renderActiveJob();
  } catch (error) {
    alert(error.message || t("delete_failed"));
  }
}

async function initializeApp() {
  try {
    const response = await fetch("/api/jobs");
    const restoredJobs = await response.json();
    restoredJobs.forEach((job) => {
      jobs.set(job.job_id, job);
    });
    if (!activeJobId) {
      activeJobId = restoredJobs[0]?.job_id || null;
    }
    if (activeJobId) {
      renderActiveJob();
    } else {
      renderJobList();
    }
    if (restoredJobs.some((job) => job.status === "queued" || job.status === "running")) {
      pollJobs();
    }
  } catch (error) {
    renderJobList();
  }
}

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  setFiles(event.dataTransfer.files);
});

fileInput.addEventListener("change", (event) => {
  setFiles(event.target.files);
});

videoInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }
  if (activeVideoUrl) {
    URL.revokeObjectURL(activeVideoUrl);
  }
  activeVideoUrl = URL.createObjectURL(file);
  activePreviewJobId = null;
  activePlaybackRange = null;
  clearAudioPreviewSource();
  videoPreview.src = activeVideoUrl;
  setPreviewMode("video");
  setPreviewVisible(true);
});

videoPreview.addEventListener("timeupdate", updateActiveRowByTime);
audioPlayer.addEventListener("timeupdate", updateActiveRowByTime);
videoPreview.addEventListener("seeking", () => {
  if (!videoPreview.paused || activePlaybackRange?.loop) {
    return;
  }
  activePlaybackRange = null;
});
audioPlayer.addEventListener("seeking", () => {
  if (!audioPlayer.paused || activePlaybackRange?.loop) {
    return;
  }
  activePlaybackRange = null;
});

assStyle.addEventListener("change", () => {
  updatePreviewVisual();
  syncPresetHighlight();
});

[language, translateTo, modelSize, diarization, speakerCount, smartSplit].forEach((control) => {
  control.addEventListener("change", syncPresetHighlight);
});

presetChips.forEach((chip) => {
  chip.addEventListener("click", () => applyPreset(chip.dataset.preset));
});

uiLocale.addEventListener("change", () => {
  currentLocale = uiLocale.value;
  localStorage.setItem("xm-ui-locale", currentLocale);
  applyI18n();
  syncPresetHighlight();
  renderJobList();
  const activeJob = jobs.get(activeJobId);
  if (activeJob) {
    updateSummary(activeJob);
  }
});

jobFilter.addEventListener("change", renderJobList);

pollToggleButton.addEventListener("click", () => {
  setPollPaused(!pollPaused);
});

qcFixButton.addEventListener("click", () => {
  applyQualityFixes("all");
});

qcFixFormatButton.addEventListener("click", () => {
  applyQualityFixes("format");
});

qcScanButton.addEventListener("click", () => {
  renderQualityPanel(currentSegments());
});

undoButton.addEventListener("click", () => applyHistory(-1));
redoButton.addEventListener("click", () => applyHistory(1));
addSegmentButton.addEventListener("click", () => insertSegmentAfter(null));
saveEditorButton.addEventListener("click", saveEditorChanges);

editorList.addEventListener("click", (event) => {
  const row = event.target.closest(".editor-row");
  if (row && !event.target.closest("button")) {
    clearTimeout(clickPreviewTimer);
    clickPreviewTimer = setTimeout(() => {
      playSegment(Number(row.dataset.index), false);
    }, 180);
  }

  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const targetRow = button.closest(".editor-row");
  if (!targetRow) {
    return;
  }

  const action = button.dataset.action;
  if (action === "add-below") {
    insertSegmentAfter(targetRow);
  } else if (action === "split") {
    splitRow(targetRow);
  } else if (action === "merge-next") {
    mergeWithNext(targetRow);
  } else if (action === "delete") {
    deleteRow(targetRow);
  }
});

editorList.addEventListener("dblclick", (event) => {
  const row = event.target.closest(".editor-row");
  if (!row || event.target.closest("button")) {
    return;
  }
  clearTimeout(clickPreviewTimer);
  playSegment(Number(row.dataset.index), true);
});

editorList.addEventListener("input", () => {
  updatePreviewVisual({
    speaker: editorList.querySelector('[data-field="speaker"]')?.value || "",
    text: editorList.querySelector('[data-field="text"]')?.value || t("subtitle_preview_default"),
  });
  const activeRow = editorList.querySelector(`.editor-row[data-index="${activePreviewIndex}"]`);
  if (activeRow) {
    syncPreviewEditor({
      speaker: activeRow.querySelector('[data-field="speaker"]')?.value || "",
      start: parseEditorTime(activeRow.querySelector('[data-field="start"]')?.value || ""),
      end: parseEditorTime(activeRow.querySelector('[data-field="end"]')?.value || ""),
      text: activeRow.querySelector('[data-field="text"]')?.value || "",
    });
  }
  scheduleHistorySnapshot();
  scheduleDraftSave();
});

[previewSpeaker, previewStart, previewEnd, previewText].forEach((control) => {
  control.addEventListener("input", () => {
    const row = editorList.querySelector(`.editor-row[data-index="${activePreviewIndex}"]`);
    if (!row) {
      return;
    }
    row.querySelector('[data-field="speaker"]').value = previewSpeaker.value;
    row.querySelector('[data-field="start"]').value = previewStart.value;
    row.querySelector('[data-field="end"]').value = previewEnd.value;
    row.querySelector('[data-field="text"]').value = previewText.value;
    updatePreviewVisual({
      speaker: previewSpeaker.value,
      text: previewText.value || t("subtitle_preview_default"),
    });
    scheduleHistorySnapshot();
    scheduleDraftSave();
  });
});

editorList.addEventListener("keydown", (event) => {
  const row = event.target.closest(".editor-row");
  if (!row) {
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    insertSegmentAfter(row);
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveEditorChanges();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeFiles.length) {
    fileInput.click();
    return;
  }

  setBusy(true);
  setJobVisible(true);
  setEditorVisible(false);

  try {
    for (const file of activeFiles) {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("language", language.value);
      payload.append("translate_to", translateTo.value);
      payload.append("model_size", modelSize.value);
      payload.append("diarization", String(diarization.value === "on"));
      payload.append("speaker_count", speakerCount.value);
      payload.append("smart_split", String(smartSplit.value === "on"));
      payload.append("ass_style", assStyle.value);

      const response = await fetch("/api/jobs", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || t("upload_failed", { name: file.name }));
      }

      const job = await response.json();
      jobs.set(job.job_id, job);
      activeJobId = job.job_id;
      renderActiveJob();
    }

    await pollJobs();
  } catch (error) {
    alert(error.message || t("submit_failed"));
    setBusy(false);
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && !editorCard.classList.contains("hidden")) {
    event.preventDefault();
    saveEditorChanges();
  }
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z" && !editorCard.classList.contains("hidden")) {
    event.preventDefault();
    applyHistory(-1);
  }
  if (((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y")) {
    if (!editorCard.classList.contains("hidden")) {
      event.preventDefault();
      applyHistory(1);
    }
  }
});

updatePreviewVisual();
initializePreferences();
syncPresetHighlight();
setPreviewVisible(false);
setJobVisible(true);
setDraftState("");
initializeApp();
