import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { WalletAddressSchema } from '@/lib/validators/payroll';
import { isValidWalletAddress } from '@/lib/rlusd/wallet';
import { z } from 'zod';

/**
 * GET /api/employee/wallet-address
 * Get authenticated employee's wallet address
 */
export async function GET() {
  console.log('=== GET /api/employee/wallet-address - START ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    console.log('Step 1: Checking authentication...');
    
    // Authentication check
    const session = await auth();
    console.log('Session data:', JSON.stringify(session, null, 2));
    if (!session?.user) {
      console.log('ERROR: No session or user found');
      console.log('Session exists:', !!session);
      console.log('User exists:', !!session?.user);
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }
    
    console.log('Step 2: Authentication successful');
    console.log('User ID:', session.user.id);
    console.log('User Type:', session.user.userType);
    console.log('User Email:', session.user.email);

    // Check if user is an employee
    console.log('Step 3: Checking user type...');
    console.log('Expected userType: employee');
    console.log('Actual userType:', session.user.userType);
    
    if (session.user.userType !== 'employee') {
      console.log('ERROR: User is not an employee');
      console.log('Access denied for userType:', session.user.userType);
      return NextResponse.json(
        { error: { message: 'Forbidden - Employee access only', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }
    
    console.log('Step 4: User type verified as employee');

    // Get employee record
    console.log('Step 5: Fetching employee record from database...');
    console.log('Query parameters:', { id: session.user.id });
    const email = session.user.email || '';
    const employee = await prisma.employee.findFirst({
      where: { email: email || '' },
      select: {
        id: true,
        walletAddress: true,
      },
    });
    
    console.log('Employee record retrieved:', !!employee);
    if (employee) {
      console.log('Employee ID:', employee.id);
      console.log('Wallet Address:', employee.walletAddress || 'Not set');
    }

    if (!employee) {
      console.log('ERROR: Employee record not found in database');
      console.log('Searched for employee ID:', session.user.id);
      return NextResponse.json(
        { error: { message: 'Employee record not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    console.log('Step 6: Preparing response...');
    const response = {
      success: true,
      walletAddress: employee.walletAddress,
    };
    console.log('Response data:', JSON.stringify(response, null, 2));
    console.log('=== GET /api/employee/wallet-address - SUCCESS ===');
    
    return NextResponse.json(response);
  } catch (error) {
    console.log('=== GET /api/employee/wallet-address - ERROR ===');
    console.error('Error fetching wallet address:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch wallet address',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/employee/wallet-address
 * Update authenticated employee's wallet address
 */
export async function PUT(req: Request) {
  console.log('=== PUT /api/employee/wallet-address - START ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    console.log('Step 1: Checking authentication...');
    
    // Authentication check
    const session = await auth();
    console.log('Session data:', JSON.stringify(session, null, 2));
    if (!session?.user) {
      console.log('ERROR: No session or user found');
      console.log('Session exists:', !!session);
      console.log('User exists:', !!session?.user);
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }
    
    console.log('Step 2: Authentication successful');
    console.log('User ID:', session.user.id);
    console.log('User Type:', session.user.userType);
    console.log('User Email:', session.user.email);

    // Check if user is an employee
    console.log('Step 3: Checking user type...');
    console.log('Expected userType: employee');
    console.log('Actual userType:', session.user.userType);
    
    if (session.user.userType !== 'employee') {
      console.log('ERROR: User is not an employee');
      console.log('Access denied for userType:', session.user.userType);
      return NextResponse.json(
        { error: { message: 'Forbidden - Employee access only', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }
    
    console.log('Step 4: User type verified as employee');

    // Parse request body
    console.log('Step 5: Parsing request body...');
    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));

    // Validate request body with Zod
    console.log('Step 6: Validating request body with Zod...');
    console.log('Validation schema: WalletAddressSchema');
    
    let validatedData;
    try {
      validatedData = WalletAddressSchema.parse(body);
      console.log('Validation successful');
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
    } catch (error) {
      console.log('ERROR: Validation failed');
      if (error instanceof z.ZodError) {
        console.log('Zod validation errors:', JSON.stringify(error.issues, null, 2));
        console.log('Number of issues:', error.issues.length);
        error.issues.forEach((issue, index) => {
          console.log(`Issue ${index + 1}:`, {
            path: issue.path,
            message: issue.message,
            code: issue.code,
          });
        });
        return NextResponse.json(
          {
            error: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: error.issues,
            },
          },
          { status: 400 }
        );
      }
      console.log('ERROR: Non-Zod validation error');
      console.error('Error details:', error);
      throw error;
    }

    // Additional wallet address validation
    console.log('Step 7: Validating wallet address format...');
    console.log('Wallet address to validate:', validatedData.walletAddress);
    
    const isValid = isValidWalletAddress(validatedData.walletAddress);
    console.log('Wallet address validation result:', isValid);
    
    if (!isValid) {
      console.log('ERROR: Invalid XRP wallet address format');
      console.log('Failed wallet address:', validatedData.walletAddress);
      return NextResponse.json(
        {
          error: {
            message: 'Invalid XRP wallet address format',
            code: 'INVALID_WALLET_ADDRESS',
          },
        },
        { status: 400 }
      );
    }
    
    console.log('Step 8: Wallet address format validated successfully');

    // Check if employee exists
    console.log('Step 9: Checking if employee exists...');
    console.log('Query parameters:', { id: session.user.id });
    
    const existingEmployee = await prisma.employee.findFirst({
      where: { email: session.user.email || '' },
    });
    
    console.log('Employee exists:', !!existingEmployee);
    if (existingEmployee) {
      console.log('Existing employee ID:', existingEmployee.id);
      console.log('Current wallet address:', existingEmployee.walletAddress || 'Not set');
    }

    if (!existingEmployee) {
      console.log('ERROR: Employee record not found in database');
      console.log('Searched for employee ID:', session.user.id);
      return NextResponse.json(
        { error: { message: 'Employee record not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }
    
    console.log('Step 10: Employee record found, proceeding to update...');

    // Update employee wallet address
    console.log('Step 11: Updating wallet address in database...');
    console.log('Update parameters:', {
      id: session.user.id,
      newWalletAddress: validatedData.walletAddress,
      oldWalletAddress: existingEmployee.walletAddress,
    });

    
    
    const updatedEmployee = await prisma.employee.update({
      where: { id: session.user.id },
      data: {
        walletAddress: validatedData.walletAddress,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        walletAddress: true,
      },
    });
    
    console.log('Step 12: Database update successful');
    console.log('Updated employee:', JSON.stringify(updatedEmployee, null, 2));
    
    console.log('Step 13: Preparing response...');
    const response = {
      success: true,
      walletAddress: updatedEmployee.walletAddress,
      message: 'Wallet address updated successfully',
    };
    console.log('Response data:', JSON.stringify(response, null, 2));
    console.log('=== PUT /api/employee/wallet-address - SUCCESS ===');

    return NextResponse.json(response);
  } catch (error) {
    console.log('=== PUT /api/employee/wallet-address - ERROR ===');
    console.error('Error updating wallet address:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      {
        error: {
          message: 'Failed to update wallet address',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}