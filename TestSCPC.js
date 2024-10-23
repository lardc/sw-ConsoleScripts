//������� SCPC
ACT_DS_NONE                             = 1;               //������� � ��������� ��������
ACT_BAT_START_CHARGE                    = 2;               //������� ����� SCPowerCell �� ����� ������� �������������
ACT_FAULT_CLEAR                         = 3;               //������� fault
ACT_WARNING_CLEAR                       = 4;               //������� warning
ACT_RESET_DEVICE                        = 5;               //���������� ����������
//-----------
ACT_SC_PULSE_CONFIG                     = 100;             //������� ����� SCPowerCell �� ������������ �������� �������� ����
ACT_SC_PULSE_START                      = 101;             //������ ������������ �������� �������� ����
//

//�������� SCPC
REG_PULSE_OFFSET_VALUE                  = 0;               //�������� �������� ������� �������� �������� ���� (������ � ����)
REG_REGULATOR_OFFSET_VALUE              = 1;               //�������� �������� ������� ����������
REG_BAT_VOLTAGE_COEF                    = 2;               //������������� ����������� ���������� �������������� �������
REG_BAT_VOLTAGE_THRESHOLD               = 3;               //����� ������ �������������� �������
REG_SC_PULSE_COEF                       = 4;               //������������� ����������� ��������� �������� �������� ����
REG_REGULATOR_OFFSET_VAR                = 5;               //����������� ��������� �������� REGULATOR_OFFSET_VALUE, �� ��������� �������� ����
//---------------
REG_SC_PULSE_VALUE                      = 64;              //�������� ��������� �������� �������� ����, �����
REG_WAVEFORM_TYPE                       = 65;              //������� ����� �������� ���� (���������/��������)
REG_TRAPEZE_EDGE_TIME                   = 66;              //����� ������������ ������ ��������, ���
REG_TEST_REGULATOR						= 67;			   //����� ������ �����: 1-���� ����������, 2-������� �����
//---------------
REG_BAT_VOLTAGE                         = 96;              //���������� �� �������������� �������, �����
REG_DEV_STATE                           = 97;              //������ ������ �����
REG_FAULT_REASON                        = 98;
REG_DISABLE_REASON                      = 99;
REG_WARNING                             = 100;
REG_PROBLEM                             = 101;
//---------------
//

//������ SCPC
ERR_SYNC_TIMEOUT                        = 1;               //��������� ����� ���������� ����� SYNC � ������� ���������
ERR_SC_PULSE_VALUE                      = 2;               //������������ �������� �������������� ����
ERR_UNIT_NOT_CONFIGURED                 = 3;               //���� �� ��������������� ��� �������� �������� �������� ����
//

//�������������� SCPC
WARNING_UINIT_NOT_READY                 = 1;               //���� ��� �� ����� � ������
//

//��������� �����
DS_None               					= 0;               //���� � �������������� ���������
DS_Fault              					= 1;               //���� � ��������� Fault
DS_Disabled           					= 2;               //���� � ��������� Disabled
DS_WaitTimeOut        					= 3;               //���� � �������� �������� ����� ���������� �������� ����
DS_BatteryChargeWait  					= 4;               //���� � ��������� �������� ������ �������������� �������
DS_Ready              					= 5;               //���� � ��������� ����������
DS_PulseConfigReady   					= 6;               //���� � � ������������������ ���������
DS_PulseStart         					= 7;               //���� � ��������� ������������ �������� �������� ����
DS_PulseEnd           					= 8;               //���� �������� ������������ �������� ����  
//

//��������� ����� �� ���������
WAVEFORM_SINE    						= 0xAAAA;			//��� ����� �������� �����
WAVEFORM_TRAPEZE  						= 0xBBBB;			//��� ����� �������� ��������
//


//-----------------------------------------------------------
function SC_SineConfig(Current)
{
	//����� �������
	if(dev.r(REG_DEV_STATE) == DS_None)
		dev.c(ACT_BAT_START_CHARGE);
	
	if(dev.r(REG_DEV_STATE) == DS_Disabled)
	{
		dev.c(ACT_FAULT_CLEAR);
		dev.c(ACT_BAT_START_CHARGE);
	}

	if(dev.r(REG_DEV_STATE) == DS_PulseConfigReady)
	{
		dev.c(ACT_DS_NONE);
		sleep(500);
		dev.c(ACT_BAT_START_CHARGE);
	}

	while(dev.r(REG_DEV_STATE)!= DS_Ready)
	{
		if (anykey()) return 1;

		if(Print_FaultDisableWarning())
			return 1;
	}

	while(dev.r(REG_DEV_STATE) == DS_WaitTimeOut)
	{
		if (anykey()) return 1;
		pinline("\r���� � �������� �������� ����� ���������� �������� ����");

		if(Print_FaultDisableWarning())
			return 1;
	}

	//������ �������� �������� ����
	dev.w(REG_SC_PULSE_VALUE, Current);
	dev.w(REG_WAVEFORM_TYPE, WAVEFORM_SINE);
	dev.w(REG_TRAPEZE_EDGE_TIME, 1000);
	dev.c(ACT_SC_PULSE_CONFIG);

	while(dev.r(REG_DEV_STATE) != DS_PulseConfigReady)
	{
		sleep(1000);

		if (anykey()) return 1;

		if(Print_FaultDisableWarning())
			return 1;
	}

	return 0;
}

//-----------------------------------------------------------


//-----------------------------------------------------------
function SC(Current,WaveForm,TrapezeEdgeTime)
{
	//����� �������
	if(dev.r(REG_DEV_STATE)==DS_None)
	{
		dev.c(ACT_BAT_START_CHARGE);
	}
	
	while(dev.r(REG_DEV_STATE)!=DS_Ready){if(Print_FaultDisableWarning()){return;}}

	//������ �������� �������� ����
	dev.w(REG_SC_PULSE_VALUE, Current);
	dev.w(REG_WAVEFORM_TYPE, WaveForm);
	dev.w(REG_TRAPEZE_EDGE_TIME, TrapezeEdgeTime);
	dev.c(ACT_SC_PULSE_CONFIG);
	while(dev.r(REG_DEV_STATE)!=DS_PulseConfigReady)
	{
		sleep(1000);
		if(Print_FaultDisableWarning()){return;}
	}
	
	//������������ �������� ����
	dev.c(ACT_SC_PULSE_START);
	sleep(20);
	while(dev.r(REG_DEV_STATE)!=DS_PulseEnd)
	{
		if(Print_FaultDisableWarning()){return;}
	}
	print("Done.");
}

//-----------------------------------------------------------


//-----------------------------------------------------------
function SC_Sine(Current, ShowGraph)
{
	SC(Current,WAVEFORM_SINE,1000);
	
	if(ShowGraph)
	{
		a=dev.rafs(1);
		plot(a,1,1);
	}
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function SC_Trapeze(Current, EdgeTime)
{
	SC(Current,WAVEFORM_TRAPEZE,EdgeTime);
	
	a=dev.rafs(1);
	plot(a,1,1);
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function SC_PulseSycle(Current, PulseNumber)
{
	for(var i=1;i<=PulseNumber;i++)
	{
		print("PulseNumber="+i);
		SC(Current);
	}
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function SCPC_Info()
{
	Status = dev.r(REG_DEV_STATE);
	Fault = dev.r(REG_FAULT_REASON);
	Disable = dev.r(REG_DISABLE_REASON);
	Warning = dev.r(REG_WARNING);
	BatVoltage = dev.r(REG_BAT_VOLTAGE);
	
	print("Status     = " + Status);
	print("Fault      = " + Fault);
	print("Disable    = " + Disable);
	print("Warning    = " + Warning);
	print("BatVoltage = " + BatVoltage);
}
//------------------------------------------------------------


//-----------------------------------------------------------
function Print_FaultDisableWarning()
{
	if((dev.r(REG_DEV_STATE)==DS_Fault))
	{
		switch(dev.r(REG_FAULT_REASON))
		{
			case ERR_SYNC_TIMEOUT:
			{
				print("Fault=ERR_SYNC_TIMEOUT");
			}
			case ERR_SC_PULSE_VALUE:
			{
				print("Fault=ERR_SC_PULSE_VALUE");
			}
			case ERR_UNIT_NOT_CONFIGURED:
			{
				print("Fault=ERR_UNIT_NOT_CONFIGURED");
			}
		}
		return 1;
	}
//---------------	
	if(dev.r(REG_DEV_STATE)==DS_Disabled)
	{
		print("Disable="+dev.r(REG_DISABLE_REASON));
		return 1;
	}
//--------------	
	if(dev.r(REG_WARNING)==DS_Disabled)
	{
		if(dev.r(REG_WARNING)==WARNING_UINIT_NOT_READY)
		{
			print("Disable=WARNING_UINIT_NOT_READY");
		}
		else
		{
			print("Disable=Unknow");
		}
	}	
//-------------
	return 0;
}
//------------------------------------------------------------


//-----------------------------------------------------------
function TestSine(Current)
{
	dev.w(REG_TEST_REGULATOR,1);//����� ����� ���������� �������
	
	SC(Current,WAVEFORM_SINE,100);
	a=dev.rafs(1);
	plot(a,1,1);
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function TestTrap(Current,EdgeTime)
{
	dev.w(REG_TEST_REGULATOR,1);//����� ����� ���������� �������
	
	SC(Current,WAVEFORM_TRAPEZE,EdgeTime);
	a=dev.rafs(1);
	plot(a,1,1);
}
//-----------------------------------------------------------

function REG_Read()
{
	print("Reg 0  = "+dev.r(0));
	print("Reg 1  = "+dev.r(1));
	print("Reg 2  = "+dev.r(2));
	print("Reg 4  = "+dev.r(4));
	print("Reg 5  = "+dev.r(5));
	print("Reg 6  = "+dev.r(6));
	print("Reg 7  = "+dev.r(7));
	print("Reg 8  = "+dev.r(8));
	print("Reg 9  = "+dev.r(9));
	print("Reg 10 = "+dev.r(10));
	print("Reg 11 = "+dev.r(11));
}