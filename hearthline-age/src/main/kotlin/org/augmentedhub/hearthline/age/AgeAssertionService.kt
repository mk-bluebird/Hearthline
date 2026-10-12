// hearthline-age/src/main/kotlin/org/augmentedhub/hearthline/age/AgeAssertionService.kt
package org.augmentedhub.hearthline.age

import com.nimbusds.jose.*
import com.nimbusds.jose.crypto.ECDSASigner
import com.nimbusds.jwt.*
import java.time.Instant
import java.util.Date

data class AgeAssertionClaims(
    val cohort: String,        // "18+", "21+" — never DOB
    val audience: String,      // "hearthline-connection-zone"
    val issuedAt: Instant,
    val expiresAt: Instant,
    val nonce: String          // replay protection
)

class AgeAssertionService(
    private val signingKey: ECKey,
    private val expectedAudience: String
) {
    private val signer = ECDSASigner(signingKey)

    fun issue(claims: AgeAssertionClaims): String {
        val header = JWSHeader.Builder(JWSAlgorithm.ES256)
            .type(JOSEObjectType.JWT)
            .build()

        val payload = JWTClaimsSet.Builder()
            .subject("age-assertion")
            .audience(expectedAudience)
            .claim("cohort", claims.cohort)
            .issueTime(Date.from(claims.issuedAt))
            .expirationTime(Date.from(claims.expiresAt))
            .claim("nonce", claims.nonce)
            .build()

        val jws = JWSObject(header, Payload(payload.toJSONObject()))
        jws.sign(signer)
        return jws.serialize()
    }

    fun verify(token: String): AgeAssertionClaims? {
        return try {
            val jws = JWSObject.parse(token)
            if (!jws.verify(ECDSASigner(signingKey))) return null

            val claims = JWTClaimsSet.parse(jws.payload.toJSONObject())
            if (claims.audience != listOf(expectedAudience)) return null
            if (claims.expirationTime.before(Date())) return null

            AgeAssertionClaims(
                cohort = claims.getStringClaim("cohort"),
                audience = claims.audience.first(),
                issuedAt = claims.issueTime.toInstant(),
                expiresAt = claims.expirationTime.toInstant(),
                nonce = claims.getStringClaim("nonce")
            )
        } catch (e: Exception) {
            null
        }
    }
}
