-- M11/M12: custom-domain support (spec §3.5 premium / §10.2).
-- customDomainToken is a DNS-TXT verification token; customDomainVerifiedAt
-- records when the domain's TXT record was confirmed.
ALTER TABLE "Page" ADD COLUMN "customDomainToken" TEXT;
ALTER TABLE "Page" ADD COLUMN "customDomainVerifiedAt" TIMESTAMP(3);