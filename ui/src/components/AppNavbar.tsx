import { Container, Navbar, Nav } from 'react-bootstrap'
import { Link } from 'wouter'

export default function AppNavbar() {
    return (
        <Navbar bg='light'>
            <Container fluid>
                <Navbar.Brand as={Link} to='/'>
                    3D Printer
                </Navbar.Brand>
                <Navbar.Toggle aria-controls='basic-navbar-nav' />
                <Nav>
                    <Nav.Link as={Link} to='/models'>
                        Models
                    </Nav.Link>
                </Nav>
                <Nav className='me-auto' />
            </Container>
        </Navbar>
    )
}
