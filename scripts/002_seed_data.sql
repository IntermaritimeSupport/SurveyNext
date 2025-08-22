-- Seed initial data
-- Insert default admin user
INSERT INTO "users" ("id", "email", "name", "password", "role", "status", "createdAt", "updatedAt") 
VALUES (
  'admin-001',
  'admin@survey.com',
  'Administrador',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
  'ADMIN',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert system settings
INSERT INTO "system_settings" ("id", "key", "value", "createdAt", "updatedAt") VALUES
('setting-001', 'site_name', '"Sistema de Encuestas"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-002', 'site_description', '"Plataforma profesional para crear y gestionar encuestas"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-003', 'default_language', '"es"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-004', 'allow_registration', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-005', 'require_email_verification', 'false', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-006', 'max_surveys_per_user', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-007', 'max_responses_per_survey', '1000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-008', 'enable_notifications', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-009', 'primary_color', '"#2563eb"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('setting-010', 'secondary_color', '"#64748b"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert email templates
INSERT INTO "email_templates" ("id", "name", "subject", "body", "variables", "createdAt", "updatedAt") VALUES
('template-001', 'welcome_email', 'Bienvenido a Sistema de Encuestas', 
'Hola {{name}},\n\nBienvenido a nuestra plataforma de encuestas. Tu cuenta ha sido creada exitosamente.\n\nSaludos,\nEl equipo de Sistema de Encuestas', 
'{"name": "Nombre del usuario"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('template-002', 'survey_invitation', 'Invitación para completar encuesta: {{survey_title}}', 
'Hola,\n\nHas sido invitado a completar la siguiente encuesta: {{survey_title}}\n\nPuedes acceder usando este enlace: {{survey_link}}\n\nGracias por tu participación.\n\nSaludos', 
'{"survey_title": "Título de la encuesta", "survey_link": "Enlace a la encuesta"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('template-003', 'survey_completion', 'Gracias por completar la encuesta', 
'Hola,\n\nGracias por completar nuestra encuesta. Tu participación es muy valiosa para nosotros.\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\nSaludos', 
'{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
