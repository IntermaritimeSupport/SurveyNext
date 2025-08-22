export const translations = {
  es: {
    // Navegación y general
    dashboard: "Panel de Control",
    surveys: "Encuestas",
    responses: "Respuestas",
    reports: "Reportes",
    settings: "Configuración",
    create: "Crear",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    loading: "Cargando...",

    // Encuestas
    createSurvey: "Crear Encuesta",
    surveyTitle: "Título de la Encuesta",
    surveyDescription: "Descripción",
    customLink: "Enlace Personalizado",
    isActive: "Activa",
    questions: "Preguntas",
    addQuestion: "Agregar Pregunta",
    questionType: "Tipo de Pregunta",
    required: "Obligatoria",

    // Tipos de preguntas
    text: "Texto",
    textarea: "Área de Texto",
    select: "Selección",
    multiselect: "Selección Múltiple",
    radio: "Opción Única",
    checkbox: "Casillas",
    rating: "Calificación",
    scale: "Escala",
    date: "Fecha",
    email: "Email",
    number: "Número",

    // Reportes
    totalResponses: "Total de Respuestas",
    completionRate: "Tasa de Finalización",
    averageTime: "Tiempo Promedio",
    viewDetails: "Ver Detalles",
    exportData: "Exportar Datos",
  },
  en: {
    // Navigation and general
    dashboard: "Dashboard",
    surveys: "Surveys",
    responses: "Responses",
    reports: "Reports",
    settings: "Settings",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",

    // Surveys
    createSurvey: "Create Survey",
    surveyTitle: "Survey Title",
    surveyDescription: "Description",
    customLink: "Custom Link",
    isActive: "Active",
    questions: "Questions",
    addQuestion: "Add Question",
    questionType: "Question Type",
    required: "Required",

    // Question types
    text: "Text",
    textarea: "Text Area",
    select: "Select",
    multiselect: "Multi Select",
    radio: "Radio",
    checkbox: "Checkbox",
    rating: "Rating",
    scale: "Scale",
    date: "Date",
    email: "Email",
    number: "Number",

    // Reports
    totalResponses: "Total Responses",
    completionRate: "Completion Rate",
    averageTime: "Average Time",
    viewDetails: "View Details",
    exportData: "Export Data",
  },
  zh: {
    // 导航和通用
    dashboard: "仪表板",
    surveys: "调查",
    responses: "回复",
    reports: "报告",
    settings: "设置",
    create: "创建",
    edit: "编辑",
    delete: "删除",
    save: "保存",
    cancel: "取消",
    loading: "加载中...",

    // 调查
    createSurvey: "创建调查",
    surveyTitle: "调查标题",
    surveyDescription: "描述",
    customLink: "自定义链接",
    isActive: "活跃",
    questions: "问题",
    addQuestion: "添加问题",
    questionType: "问题类型",
    required: "必需",

    // 问题类型
    text: "文本",
    textarea: "文本区域",
    select: "选择",
    multiselect: "多选",
    radio: "单选",
    checkbox: "复选框",
    rating: "评级",
    scale: "量表",
    date: "日期",
    email: "邮箱",
    number: "数字",

    // 报告
    totalResponses: "总回复数",
    completionRate: "完成率",
    averageTime: "平均时间",
    viewDetails: "查看详情",
    exportData: "导出数据",
  },
} as const

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.es

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || translations.es[key]
}
