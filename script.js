// Initialize AOS (Animate On Scroll)
AOS.init({
    duration: 1000,
    easing: 'ease-in-out',
    once: true,
    mirror: false
});
// Particles.js configuration
particlesJS('particles-js', {
    particles: {
        number: {
            value: 80,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: ['#00d4ff', '#8a2be2']
        },
        shape: {
            type: 'circle',
            stroke: {
                width: 0,
                color: '#000000'
            }
        },
        opacity: {
            value: 0.5,
            random: false,
            anim: {
                enable: false,
                speed: 1,
                opacity_min: 0.1,
                sync: false
            }
        },
        size: {
            value: 3,
            random: true,
            anim: {
                enable: false,
                speed: 40,
                size_min: 0.1,
                sync: false
            }
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: '#00d4ff',
            opacity: 0.4,
            width: 1
        },
        move: {
            enable: true,
            speed: 6,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
            attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
            }
        }
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: {
                enable: true,
                mode: 'repulse'
            },
            onclick: {
                enable: true,
                mode: 'push'
            },
            resize: true
        },
        modes: {
            grab: {
                distance: 400,
                line_linked: {
                    opacity: 1
                }
            },
            bubble: {
                distance: 400,
                size: 40,
                duration: 2,
                opacity: 8,
                speed: 3
            },
            repulse: {
                distance: 200,
                duration: 0.4
            },
            push: {
                particles_nb: 4
            },
            remove: {
                particles_nb: 2
            }
        }
    },
    retina_detect: true
});
// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});
// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger?.classList.remove('active');
    navMenu?.classList.remove('active');
}));
// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(10, 10, 10, 0.98)';
    } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.95)';
    }
});
// Skill bars animation
const animateSkillBars = () => {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const skillBar = entry.target;
                const width = skillBar.getAttribute('data-width');
                skillBar.style.width = width;
                skillBar.classList.add('animated');
            }
        });
    }, {
        threshold: 0.5
    });
    skillBars.forEach(bar => {
        observer.observe(bar);
    });
};
// Initialize skill bars animation
animateSkillBars();
// Lightbox functionality
const certificateData = {
    cert1: {
        title: 'IIRS Summer School 2023',
        subtitle: 'Remote Sensing & GIS Applications',
        description: 'Completed intensive training program on Remote Sensing and Geographic Information Systems applications, gaining expertise in satellite data analysis and spatial data processing.',
        icon: 'fas fa-satellite'
    },
    cert2: {
        title: 'Thomso 2024, IIT Roorkee',
        subtitle: 'AI/ML Workshop',
        description: 'Participated in advanced Artificial Intelligence and Machine Learning workshop at IIT Roorkee, learning cutting-edge techniques in data science and neural networks.',
        icon: 'fas fa-robot'
    },
    cert3: {
        title: 'Google Digital Garage',
        subtitle: 'Fundamentals of Digital Marketing',
        description: 'Completed comprehensive digital marketing certification covering SEO, SEM, social media marketing, and analytics from Google Digital Garage.',
        icon: 'fab fa-google'
    },
    cert4: {
        title: 'Srijan Social Internship',
        subtitle: 'Lead Changemaker',
        description: 'Led social impact initiatives and community development projects, demonstrating leadership in creating positive social change.',
        icon: 'fas fa-hands-helping'
    },
    cert5: {
        title: 'Interior Design Business',
        subtitle: 'Client Handling & Project Management',
        description: 'Gained practical experience in client relationship management and project coordination in the interior design industry.',
        icon: 'fas fa-home'
    }
};
function openLightbox(certId) {
    const lightbox = document.getElementById('lightbox');
    const lightboxBody = document.getElementById('lightbox-body');
    const cert = certificateData[certId];
    
    if (cert) {
        lightboxBody.innerHTML = `
            <div style="text-align: center;">
                <i class="${cert.icon}" style="font-size: 4rem; color: #8a2be2; margin-bottom: 1rem;"></i>
                <h2 style="color: #00d4ff; margin-bottom: 0.5rem;">${cert.title}</h2>
                <h3 style="color: #8a2be2; margin-bottom: 2rem;">${cert.subtitle}</h3>
                <p style="color: #cccccc; line-height: 1.8; font-size: 1.1rem;">${cert.description}</p>
            </div>
        `;
        lightbox.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';
}
// Close lightbox when clicking outside
document.getElementById('lightbox')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeLightbox();
    }
});
// Close lightbox with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});
// Contact form handling
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    // Simple form validation
    if (!name || !email || !message) {
        alert('Please fill in all fields.');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Submit form to server
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/save-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, message }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Thank you for your message! I\'ll get back to you soon.');
            this.reset();
        } else {
            alert(result.message || 'Failed to send message. Please try again.');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again later.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});
// Typing animation for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}
// Initialize typing animation when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 50);
        }, 1000);
    }
});
// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroContent = document.querySelector('.hero-content');
    
    if (heroContent) {
        heroContent.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});
// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});
// Intersection Observer for project cards animation
const observeProjects = () => {
    const projectCards = document.querySelectorAll('.project-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.opacity = '1';
            }
        });
    }, {
        threshold: 0.1
    });
    projectCards.forEach(card => {
        card.style.transform = 'translateY(50px)';
        card.style.opacity = '0';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
};
// Initialize project cards animation
observeProjects();
// Add glitch effect to hero name on hover
const heroName = document.querySelector('.hero-name');
if (heroName) {
    heroName.addEventListener('mouseenter', () => {
        heroName.style.animation = 'glitch 0.5s ease-in-out';
    });
    
    heroName.addEventListener('animationend', () => {
        heroName.style.animation = 'glow 2s ease-in-out infinite alternate';
    });
}
// Add CSS for glitch effect
const style = document.createElement('style');
style.textContent = `
    @keyframes glitch {
        0% { transform: translateX(0); }
        20% { transform: translateX(-2px); }
        40% { transform: translateX(2px); }
        60% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
        100% { transform: translateX(0); }
    }
    
    .loaded {
        opacity: 1;
    }
    
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
`;
document.head.appendChild(style);
// Console message for developers
console.log(`
🚀 Portfolio Website - Anant Chauhan
💻 Built with HTML, CSS, and JavaScript
🎨 Design: Dark theme with neon accents
✨ Features: Particle animations, smooth scrolling, responsive design
Connect with me:
📧 anantchauhan2006@gmail.com
💼 https://linkedin.com/in/anant-chauhan-243550306
🐙 https://github.com/INFINITY-AnantChauhan
`);