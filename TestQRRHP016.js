include("PrintStatus.js")
include("CalGeneral.js")
include("Tektronix.js")

// Predefined variables
qrr_idc_width = 2000;		// in us
qrr_single = 1;
qrr_print = 1;
print_plot = 0;
CALIBRATION_PROCESS = 1;

// Параметры для ресурсного теста
CurrentMin = 320; 			// в А
CurrentMax = 3200; 			// в А
// 
CurrentRateN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
CurrentRateB = [0.167, 0.25, 0.334, 0.834, 1.667, 2.5, 3.334, 5, 8.334, 10, 16.667];
//
VoltageMin = 402;			// в В
VoltageMax = 3000;		// в В
//
VoltageRare = [20, 50, 100, 200];
// 
TqMin = 3;					// в мкс
TqMax = 1000;				// в мкс

function QRR_Cal_Reg(En)
{
	if(dev.r(2) == 0)
		QSU_WriteReg(160, 140, En);
	if(dev.r(3) == 0)
		QSU_WriteReg(161, 140, En);
	if(dev.r(4) == 0)
		QSU_WriteReg(162, 140, En);
	if(dev.r(5) == 0)
		QSU_WriteReg(170, 140, En);
	if(dev.r(6) == 0)
		QSU_WriteReg(171, 140, En);
	if(dev.r(7) == 0)
		QSU_WriteReg(172, 140, En);
	dev.w(140,En);
}
// QRR
function QRR_Start(Mode, IDC, IDCFallRate, OSV, OSVRate)
{	
	
	if (dev.r(192) == 1)
	{
		QRR_Status();
		dev.c(3);
		print("Clear fault");
		sleep(500);
	}
	
	if (dev.r(192) == 0)
	{
		print("Power up");
		dev.c(1);
		
		while (dev.r(192) == 3)
		{
			if (anykey()) return;
			sleep(50);
		}
	}
	
	if (dev.r(192) != 4)
	{
		print("Abnormal state = " + dev.r(192));
		return;
	}
	
	dev.w(128, Mode);
	//
	dev.w(129, IDC);
	dev.w(130, qrr_idc_width);
	dev.w(132, IDCFallRate);
	//
	dev.w(133, OSV);
	dev.w(134, OSVRate);
	
	if (qrr_single)
		dev.c(102);
	else
	{
		print("Process");
		dev.c(100);
	}
	
	var pulse_counter = dev.r(199);
	while (dev.r(192) == 5)
	{
		if (anykey()) return;
		if (pulse_counter != dev.r(199))
		{
			
			pulse_counter = dev.r(199);
			if(qrr_print)
				print("Pulse #" + pulse_counter);
		}
		sleep(50);
	}
	if(print_plot)
		pl(dev.rafs(1));
	
	if(qrr_print)
	{
		if (dev.r(192) != 4)
			print("Failed");
		
		if (dev.r(205) != 0)
			print("DC retries number: " + dev.r(205));
		
		if (dev.r(198) != 1)
		{
			print("Operation result: " + dev.r(198));
			QRR_Status();
		}
	}
}

// Рандомное значение из диапазона
function QRR_GetRandom(min, max) 
{
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); 
}

// Рандомное значение из диапазона с дискретностью 10
function QRR_GetRandomTen(min, max) 
{
  min = Math.ceil(min) / 10;
  max = Math.floor(max) / 10;
  return Math.floor(Math.random() * (max - min + 1) + min) * 10; 
}

// Рандомное значение из массива
function QRR_GetRandomАrray(Data)
{
	return Data[Math.floor(Math.random() * Data.length)]
}

function QRR_Resource(Mode)
{
	var qrr_resource_test = 8;
	var i, k = 1;
	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + qrr_resource_test;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);								// Задаем новое количество часов в дату

	while((new Date()).getTime() < today.getTime() || (!anykey()))		// Сравниваем текущее время на компьютере в мс, с конечным временем в мс
	{
		SetCurrent = QRR_GetRandomTen(CurrentMin, CurrentMax);
		SetCurrentRateB = QRR_GetRandomАrray(CurrentRateN);
		SetVoltage = QRR_GetRandom(VoltageMin, VoltageMax);
		SetVoltageRare = QRR_GetRandomАrray(VoltageRare);
		SetTq = QRR_GetRandom(TqMin, TqMax);
		dev.w(135,SetTq);
		while(dev.r(192) != 4 && !anykey()){sleep(100)};
		QRR_Start(Mode, SetCurrent, SetCurrentRate, SetVoltage, SetVoltageRare);
		while(dev.r(198) == 0 && !anykey()){sleep(100)};

		print("-------------------------")
		var left_time = new Date((today.getTime()) - ((new Date()).getTime()));
		print("Номер " + k + " измерения, Осталось " + (left_time.getHours()-3) + " ч " + left_time.getMinutes() + " мин");
		k++;
		print("Id: " + SetCurrent + ", А");
		print("dI/dt: " + SetCurrentRateB + ", А/мкс");
		print("Ud: " + SetVoltage + ", В");
		print("dU/dt: " + SetVoltageRare + ", В/мкс");
		print("Tq: " + SetTq + ", мкс");

		if(dev.r(193) == 1) 
		{
			print("QRR FAULT");
			break;
		}
		if (anykey()) break;
	}	
}	

function QRR_Status()
{
	print("[QSU]")
	QSU_Status();
	PrintStatus();
	print("Fault ex. r.:	" + dev.r(197));
	print("Op. result:	" + dev.r(198));
	print("-------------------------");
	
	print("[CROVU]");
	if (dev.r(0) == 0)
	{	
		QSU_NodeStatus(7, 192);
		print("Fault ex. r.:	" + QSU_ReadReg(7, 199));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[FCROVU]");
	if (dev.r(1) == 0)
	{	
		QSU_NodeStatus(12, 192);
		print("Fault ex. r.:	" + QSU_ReadReg(12, 199));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[DCU1]");
	if (dev.r(2) == 0)
	{	
		QSU_NodeStatus(160, 192);
		print("Fault:		" + QSU_ReadReg(160, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[DCU2]");
	if (dev.r(3) == 0)
	{	
		QSU_NodeStatus(161, 192);
		print("Fault:		" + QSU_ReadReg(161, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[DCU3]");
	if (dev.r(4) == 0)
	{	
		QSU_NodeStatus(162, 192);
		print("Fault:		" + QSU_ReadReg(162, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[RCU1]");
	if (dev.r(5) == 0)
	{	
		QSU_NodeStatus(170, 192);
		print("Fault:		" + QSU_ReadReg(170, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[RCU2]");
	if (dev.r(6) == 0)
	{	
		QSU_NodeStatus(171, 192);
		print("Fault:		" + QSU_ReadReg(171, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[RCU3]");
	if (dev.r(7) == 0)
	{	
		QSU_NodeStatus(172, 192);
		print("Fault:		" + QSU_ReadReg(172, 193));
	}
	else
		print("Emulation");
	print("-------------------------");
	
	print("[HS Sampler]");
	if (dev.r(8) == 0)
	{
		QSU_NodeStatus(0, 192);
		print("Op. result:	" + QSU_ReadReg(0, 197));
	}
	else
		print("Emulation");
	print("-------------------------");	
}

function QRR_Result()
{
	var op_result = dev.r(198);
	print("Result " + ((op_result == 0) ? "NONE" : (op_result == 1) ? "OK" : "FAILED"));
	print("Qrr (GOST), uC: " + (dev.r(218) << 16 | dev.r(210)) / 100);
	print("Qrr,        uC: " + (dev.r(219) << 16 | dev.r(216)) / 10);
	print("Irr,         A: -" + (dev.r(211) / 10));
	print("trr,        us: " + (dev.r(212) / 100));
	print("tq,         us: " + (dev.r(213) / 10));
	print("Idc,         A: " + dev.r(214));
	print("dIdt,     A/us: " + (dev.r(215) / 100));
	QSU_Plot();
}

function QRR_PlotDiag()
{
	var p;
	for (var i = 3; i <= 11; ++i)
	{
		plot(p = dev.raf(i), 1, 0);
		save("_qrr_diag" + i + ".txt", p);
		sleep(200);
	}
}

function QRR_PlotFull(Scale)
{
    var a, b;

    a = new Array();
    b = new Array();

    while(true)
    {
		QSU_WriteReg(0, 151, Scale);
		
        QSU_Call(0, 11);
		QSU_ReadArray(0, 4);
        var a1 = dev.rafs(1);
		
		QSU_ReadArray(0, 5);
        var b1 = dev.rafs(1);
        
		a = a.concat(a1);
		b = b.concat(b1);

        if(a1.length == 0 || anykey())
			break;
    }

	print(a.length);
    plot(a, 1, 0); sleep(500);
	plot(b, 1, 0);
}

// QSU
function QSU_SamplerResult()
{
	var op_result = QSU_ReadReg(0, 200);
	print("Result " + ((op_result == 0) ? "NONE" : (op_result == 1) ? "OK" : "FAILED"));
	print("Id,    A: " + QSU_ReadReg(0, 207));
	print("Irr,   A: " + QSU_ReadReg(0, 201));
	print("Qrr,  uC: " + QSU_ReadReg(0, 203));
	print("trr,  us: " + (QSU_ReadReg(0, 202) / 10));
	print("Zero, us: " + (QSU_ReadReg(0, 204) / 10));
	print("ZeroV,us: " + (QSU_ReadReg(0, 205) / 10));
	print("dI/dt   : " + (QSU_ReadReg(0, 206) / 10));
	
	QSU_Plot(0, 1);
	sleep(200);
	QSU_Plot(0, 2);
}

function QSU_ReadReg(NodeID, Reg)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.c(10);
	
	if (dev.r(230) == 0)
		return dev.r(231);
	else
	{
		print("Err code: " + dev.r(230));
		return 0;
	}
}

function QSU_ReadRegS(NodeID, Reg)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.c(10);
	
	if (dev.r(230) == 0)
		return dev.rs(231);
	else
	{
		print("Err code: " + dev.r(230));
		return 0;
	}
}

function QSU_WriteReg(NodeID, Reg, Value)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.w(152, Value);
	dev.c(11);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_WriteRegS(NodeID, Reg, Value)
{
	dev.w(150, NodeID);
	dev.w(151, Reg);
	dev.ws(152, Value);
	dev.c(11);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_Call(NodeID, Action)
{
	dev.w(150, NodeID);
	dev.w(151, Action);
	dev.c(12);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_ReadArray(NodeID, EndPoint)
{
	dev.w(150, NodeID);
	dev.w(151, EndPoint);
	dev.c(13);
	
	if (dev.r(230) != 0)
		print("Err code: " + dev.r(230));
}

function QSU_Status()
{
	print("Logic state:	" + dev.r(200));
	print("[Interface status]");
	print("Device: 	" + dev.r(201));
	print("Function: 	" + dev.r(202));
	print("Error: 		" + dev.r(203));
	print("ExtData:	" + dev.r(204));
}

function QSU_Plot(Node, EndPoint)
{
	QSU_ReadArray(Node, EndPoint);
	plot(dev.rafs(12), 1, 0);
}

function QSU_NodeStatus(Node, BaseReg)
{
	print("Registers [" + BaseReg + " - " + (BaseReg + 5) + "]");
	print("Device state:	" + QSU_ReadReg(Node, BaseReg));
	print("Fault reason:	" + QSU_ReadReg(Node, BaseReg + 1));
	print("Disable reason:	" + QSU_ReadReg(Node, BaseReg + 2));
	print("Warning:	" + QSU_ReadReg(Node, BaseReg + 3));
	print("Problem:	" + QSU_ReadReg(Node, BaseReg + 4));
	print("SubDevice state:	" + QSU_ReadReg(Node, BaseReg + 5));

}

function QSU_TestCom()
{
	while(!anykey())
	{
		QSU_Call(0, 10);
		sleep(100);
		QSU_Plot(0, 3);
		sleep(1000);
	}
}
//------------------------

function QSU_Plot(Divisor)
{
	var a, b;

	a = new Array();
	b = new Array();

	while(true)
	{
		var a1 = dev.rafs(1);
		var b1 = dev.rafs(2);
		
		a = a.concat(a1);
		b = b.concat(b1);

		if(a1.length == 0)
		break;
	}
	var CurrentDiv = 10;
	if (typeof Divisor != 'undefined')
		CurrentDiv = Divisor;		
plot2(a, b, 1, 0);

}

//------------------------