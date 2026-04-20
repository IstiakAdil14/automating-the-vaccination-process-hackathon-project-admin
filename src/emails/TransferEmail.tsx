import {
  Html, Head, Body, Container, Section, Text,
  Heading, Hr, Preview,
} from "@react-email/components";

interface TransferEmailProps {
  staffName:      string;
  fromCenterName: string;
  toCenterName:   string;
  newRole:        string;
  effectiveDate:  string;
}

export function TransferEmail({ staffName, fromCenterName, toCenterName, newRole, effectiveDate }: TransferEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your VaxAdmin assignment has been updated</Preview>
      <Body style={{ backgroundColor: "#F8FAFC", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#FFFFFF", borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
          <Section style={{ backgroundColor: "#0F172A", padding: "32px 40px" }}>
            <Heading style={{ color: "#10B981", fontSize: "20px", margin: 0 }}>Assignment Updated</Heading>
            <Text style={{ color: "#94A3B8", fontSize: "12px", margin: "4px 0 0" }}>
              VaxAdmin - Government Vaccination Management System
            </Text>
          </Section>

          <Section style={{ padding: "32px 40px" }}>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Dear <strong>{staffName}</strong>,
            </Text>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Your center assignment has been updated effective <strong>{effectiveDate}</strong>.
            </Text>

            <Section style={{ backgroundColor: "#F1F5F9", borderRadius: "8px", padding: "20px 24px", margin: "20px 0" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <Text style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>From</Text>
                  <Text style={{ margin: 0, color: "#0F172A", fontWeight: "600" }}>{fromCenterName}</Text>
                </div>
                <div style={{ flex: 1 }}>
                  <Text style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "600", color: "#10B981", textTransform: "uppercase" }}>To</Text>
                  <Text style={{ margin: 0, color: "#0F172A", fontWeight: "600" }}>{toCenterName}</Text>
                </div>
              </div>
              <Hr style={{ borderColor: "#E2E8F0", margin: "12px 0" }} />
              <Text style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>New Role</Text>
              <Text style={{ margin: 0, color: "#0F172A", fontWeight: "600" }}>{newRole}</Text>
            </Section>

            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Please report to your new center on the effective date. Contact your supervisor if you have any questions.
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
