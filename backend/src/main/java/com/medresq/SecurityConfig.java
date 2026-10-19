package com.medresq;

import java.util.List;
import java.util.Arrays;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {
    @Bean SecurityFilterChain security(HttpSecurity http, AuthService auth,
        @Value("${app.allowed-origins}") String origins) throws Exception {
        var cors=new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.asList(origins.split(",")));
        cors.setAllowedMethods(List.of("GET","POST","PUT","PATCH","OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization","Content-Type"));
        var source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/api/**",cors);
        http.cors(c->c.configurationSource(source))
            // Auth uses an explicit bearer header, never browser cookies.
            .csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a
                .requestMatchers("/api/auth/login","/api/auth/otp/send","/api/auth/otp/verify","/api/health").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET,"/api/hospitals/**","/api/ambulances","/api/system","/api/analytics").permitAll()
                .requestMatchers("/api/**").authenticated().anyRequest().permitAll())
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->{
                res.setStatus(401); res.setContentType("application/json"); res.getWriter().write("{\"message\":\"Sign in to continue\"}");
            }))
            .addFilterBefore(new OncePerRequestFilter() {
                @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
                    var user=auth.authenticate(token(req));
                    if(user!=null) SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(user,null,List.of(new SimpleGrantedAuthority("ROLE_"+user.role().toUpperCase()))));
                    chain.doFilter(req,res);
                }
            },UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    static String token(HttpServletRequest request) {
        var header=request.getHeader("Authorization");
        return header!=null && header.startsWith("Bearer ") ? header.substring(7) : null;
    }
}
