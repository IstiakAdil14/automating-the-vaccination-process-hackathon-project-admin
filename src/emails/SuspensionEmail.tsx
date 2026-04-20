import {
  Html, Head, Body, Container, Section, Text,
  Heading, Hr, Preview,
} from "@react-email/components";

interface SuspensionEmailProps {
  staffName:    string;
  reason:       string;
  suspendUntil: string | null;   /* null = permanent */
  contactEmail: string;
}

export function SuspensionEmail({ staffName, reason, suspendUntil, contactEmail }: SuspensionEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Important: Your VaxAdmin account has been suspended</Preview>
      <Body style={{ backgroundColor: "#F8FAFC", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#FFFFFF", borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
          <Section style={{ backgroundColor: "#7F1D1D", padding: "32px 40px" }}>
            <Heading style={{ color: "#FCA5A5", fontSize: "20px", margin: 0 }}>Account Suspended</Heading>
            <Text style={{ color: "#FCA5A5", fontSize: "12px", margin: "4px 0 0", opacity: 0.8 }}>
              VaxAdmin - Government Vaccination Management System
            </Text>
          </Section>

          <Section style={{ padding: "32px 40px" }}>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Dear <strong>{staffName}</strong>,
            </Text>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Your VaxAdmin staff account has been <strong style={{ color: "#EF4444" }}>suspended</strong>{" "}
              {suspendUntil ? `until ${suspendUntil}` : "permanently"}.
            </Text>

            <Section style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "16px 20px", margin: "20px 0" }}>
              <Text style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "600", color: "#991B1B", textTransform: "uppercase" }}>
                Reason
              </Text>
              <Text style={{ margin: 0, color: "#7F1D1D", fontSize: "14px" }}>{reason}</Text>
            </Section>

            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              If you believe this is an error, please contact your supervisor or reach out to{" "}
              <a href={`mailto:${contactEmail}`} style={{ color: "#10B981" }}>{contactEmail}</a>.
            </Text>
          </Section>

          <Hr style={{ borderColor: "#E2E8F0", margin: "0 40px" }} />
          <Section style={{ padding: "20px 40px" }}>
            <Text style={{ color: "#94A3B8", fontSize: "11px", margin: 0 }}>
              - 2025 Ministry of Health & Family Welfare, Bangladesh.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
