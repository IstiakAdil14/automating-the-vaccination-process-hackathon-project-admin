import {
  Html, Head, Body, Container, Section, Text,
  Heading, Hr, Button, Preview,
} from "@react-email/components";

interface AccountCreationEmailProps {
  staffName:    string;
  email:        string;
  tempPassword: string;
  centerName:   string;
  role:         string;
  loginUrl:     string;
}

export function AccountCreationEmail({
  staffName, email, tempPassword, centerName, role, loginUrl,
}: AccountCreationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your VaxAdmin staff account has been created</Preview>
      <Body style={{ backgroundColor: "#F8FAFC", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#FFFFFF", borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
          {/* Header */}
          <Section style={{ backgroundColor: "#0F172A", padding: "32px 40px" }}>
            <Heading style={{ color: "#10B981", fontSize: "20px", margin: 0 }}>VaxAdmin Portal</Heading>
            <Text style={{ color: "#94A3B8", fontSize: "12px", margin: "4px 0 0" }}>
              Government Vaccination Management System
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px 40px" }}>
            <Heading style={{ fontSize: "18px", color: "#0F172A", marginTop: 0 }}>
              Welcome, {staffName}!
            </Heading>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Your staff account has been created for the <strong>{centerName}</strong> vaccination center.
              You have been assigned the role of <strong>{role}</strong>.
            </Text>

            {/* Credentials box */}
            <Section style={{ backgroundColor: "#F1F5F9", borderRadius: "8px", padding: "20px 24px", margin: "24px 0" }}>
              <Text style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Your Login Credentials
              </Text>
              <Text style={{ margin: "4px 0", fontSize: "14px", color: "#0F172A" }}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={{ margin: "4px 0", fontSize: "14px", color: "#0F172A" }}>
                <strong>Temporary Password:</strong>{" "}
                <span style={{ fontFamily: "monospace", backgroundColor: "#E2E8F0", padding: "2px 8px", borderRadius: "4px" }}>
                  {tempPassword}
                </span>
              </Text>
            </Section>

            <Text style={{ color: "#EF4444", fontSize: "13px", fontWeight: "600" }}>
              - You must change your password on first login.
            </Text>

            <Button
              href={loginUrl}
              style={{
                backgroundColor: "#10B981", color: "#FFFFFF", padding: "12px 28px",
                borderRadius: "8px", fontSize: "14px", fontWeight: "600",
                textDecoration: "none", display: "inline-block", marginTop: "16px",
              }}
            >
              Login to VaxAdmin
            </Button>
          </Section>

          <Hr style={{ borderColor: "#E2E8F0", margin: "0 40px" }} />
          <Section style={{ padding: "20px 40px" }}>
            <Text style={{ color: "#94A3B8", fontSize: "11px", margin: 0 }}>
              - 2025 Ministry of Health & Family Welfare, Bangladesh. This is a confidential system.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
