import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterModule],
  template: `
    <footer class="site-footer">
      <div class="footer-container">
        <div class="footer-section">
          <h3>Task Triage</h3>
          <p>A systematic approach to task prioritization and decision-making.</p>
        </div>
        
        <div class="footer-section">
          <h4>Features</h4>
          <ul>
            <li>Brain dump processing</li>
            <li>Multi-criteria evaluation</li>
            <li>Weighted scoring</li>
            <li>Transparent reasoning</li>
          </ul>
        </div>
        
        <div class="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="#" aria-label="About Task Triage">About</a></li>
            <li><a href="#" aria-label="Help and documentation">Help</a></li>
            <li><a href="#" aria-label="Privacy policy">Privacy</a></li>
            <li><a href="#" aria-label="Terms of service">Terms</a></li>
          </ul>
        </div>
        
        <div class="footer-section">
          <h4>Built With</h4>
          <ul>
            <li>Angular 20</li>
            <li>TypeScript</li>
            <li>@fourfold/angular-foundation</li>
            <li>Powered by Claude AI</li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <div class="footer-container">
          <p>&copy; 2024 Task Triage. Built for productivity and clarity.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .site-footer {
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      margin-top: 4rem;
    }
    
    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }
    
    .site-footer {
      padding: 2rem 0 0;
    }
    
    .footer-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }
    
    .footer-section h3 {
      color: #007acc;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }
    
    .footer-section h4 {
      color: #333;
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
    }
    
    .footer-section p {
      color: #666;
      line-height: 1.5;
      margin: 0;
    }
    
    .footer-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .footer-section li {
      margin-bottom: 0.5rem;
    }
    
    .footer-section a {
      color: #666;
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .footer-section a:hover {
      color: #007acc;
    }
    
    .footer-bottom {
      border-top: 1px solid #e0e0e0;
      padding: 1rem 0;
      margin-top: 2rem;
      background: #f0f0f0;
    }
    
    .footer-bottom p {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
      text-align: center;
    }
    
    @media (max-width: 768px) {
      .footer-container {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }
  `]
})
export class FooterComponent {}